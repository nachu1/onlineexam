// server.js
console.log("SERVER.JS LOADED");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const Student = require("./models/student");
const Result = require("./models/result");
const Question = require("./models/question");
const Config = require("./models/config");

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
    session({
        secret: "exam-secret",
        resave: false,
        saveUninitialized: true,
    })
);

/* ------------------ DATABASE ------------------ */
mongoose
    .connect("mongodb+srv://onlineexam:Exam%401234@cluster0.0ci6zj6.mongodb.net/onlineexam?retryWrites=true&w=majority")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));



/* ------------------ HELPERS ------------------ */
async function getConfig() {
    let config = await Config.findOne();
    if (!config) {
        config = new Config({
            currentExam: 1,
            examStarted: false,
            examStopped: false,
            resultPublished: false,
        });
        await config.save();
    }
    return config;
}

/* ------------------ HOME ------------------ */
app.get("/", (req, res) => res.redirect("/login"));

/* ------------------ STUDENT AUTH ------------------ */
app.get("/signup", (req, res) => {
    res.render("signup", { message: null });
});

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.render("signup", { message: "All fields required" });

    if (await Student.findOne({ email }))
        return res.render("signup", { message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
        email,
        password: hashedPassword
    });

    req.session.student = student;
    res.redirect("/dashboard");
});


app.get("/login", (req, res) => {
    res.render("login", { message: null });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student)
        return res.render("login", { message: "Email not found" });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch)
        return res.render("login", { message: "Invalid password" });

    req.session.student = student;
    res.redirect("/dashboard");
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { message: null });
});
app.post("/forgot-password", async (req, res) => {
    const student = await Student.findOne({ email: req.body.email });
    if (!student)
        return res.render("forgot-password", { message: "Email not found" });

    const token = crypto.randomBytes(32).toString("hex");

    await Student.updateOne(
        { _id: student._id },
        {
            resetToken: token,
            resetTokenExpiry: Date.now() + 15 * 60 * 1000
        }
    );

    console.log("RESET LINK:");
    console.log(`http://localhost:3000/reset-password/${token}`);
    // later replace with Render URL

    res.render("forgot-password", {
        message: "Reset link generated (check server console)"
    });
});
app.get("/reset-password/:token", async (req, res) => {
    const student = await Student.findOne({
        resetToken: req.params.token,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!student)
        return res.send("Invalid or expired link");

    res.render("reset-password", { message: null });
});

app.post("/reset-password/:token", async (req, res) => {
    const student = await Student.findOne({
        resetToken: req.params.token,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!student)
        return res.send("Invalid or expired link");

    student.password = await bcrypt.hash(req.body.password, 10);
    student.resetToken = undefined;
    student.resetTokenExpiry = undefined;

    await student.save();
    res.redirect("/login");
});


app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

/* ------------------ SET STUDENT NAME ------------------ */
/* REQUIRED for dashboard Start Exam button */
app.post("/student/set-name", async (req, res) => {
    if (!req.session.student)
        return res.json({ success: false });

    const { displayName } = req.body;
    if (!displayName)
        return res.json({ success: false });

    await Student.findByIdAndUpdate(
        req.session.student._id,
        { displayName }
    );

    req.session.student.displayName = displayName;
    res.json({ success: true });
});

/* ------------------ DASHBOARD ------------------ */
app.get("/dashboard", async (req, res) => {
    if (!req.session.student) return res.redirect("/login");

    const config = await getConfig();
    const existing = await Result.findOne({
        studentId: req.session.student._id,
        examNumber: config.currentExam,
    });

    res.render("dashboard", {
        student: req.session.student,
        alreadySubmitted: !!existing,
        config,
    });
});

/* ------------------ EXAM PAGE ------------------ */
app.get("/exam", async (req, res) => {
    if (!req.session.student) return res.redirect("/login");

    const config = await getConfig();

    if (!config.examStarted || config.examStopped)
        return res.send("Exam is not active.");

    const existing = await Result.findOne({
        studentId: req.session.student._id,
        examNumber: config.currentExam,
    });

    if (existing) {
        return res.send("You have already submitted this exam.");
    }

    // 🚨 If student already started exam and tries to come back
    // 🚨 Student trying to RE-ENTER exam
if (req.session.examStarted) {

    // 🔒 Refresh is allowed ONCE (same URL reload)
    if (req.headers["sec-fetch-mode"] === "navigate" &&
        req.headers["sec-fetch-dest"] === "document") {

        // Allow refresh: do NOT auto-submit
        const questions = await Question.find();

        return res.render("exam", {
            questions,
            examNumber: config.currentExam,
            studentName:
                req.session.student.displayName || req.session.student.email,
            totalQuestions: questions.length,
        });
    }

    // ❌ Any other navigation = auto submit
    const questions = await Question.find();

    await Result.create({
        studentId: req.session.student._id,
        name: req.session.student.email,
        displayName: req.session.student.displayName,
        examNumber: config.currentExam,
        answers: {},
        score: 0,
        correct: 0,
        wrong: 0,
        notAttended: questions.length,
        totalQuestions: questions.length,
        published: false,
    });

    req.session.examStarted = false;
    req.session.examStartTime = null;

    return res.send(
        "You left the exam. It has been auto-submitted and cannot be re-opened."
    );
}

    // ✅ First time entry
    req.session.examStarted = true;
    req.session.examStartTime = Date.now();

    const questions = await Question.find();

    if (questions.length === 0) {
        return res.render("exam-empty");
    }

    res.render("exam", {
        questions,
        examNumber: config.currentExam,
        studentName:
            req.session.student.displayName || req.session.student.email,
        totalQuestions: questions.length,
    });
});



/* ------------------ SUBMIT EXAM ------------------ */
app.post("/submit", async (req, res) => {
    if (!req.session.student)
        return res.json({ success: false, msg: "Login required" });

    const config = await getConfig();

    if (!config.examStarted || config.examStopped)
        return res.json({ success: false, msg: "Exam not accepting submissions" });

    // ❗ prevent double submit
    const existing = await Result.findOne({
        studentId: req.session.student._id,
        examNumber: config.currentExam,
    });

    if (existing)
        return res.json({ success: true, msg: "Already submitted" });

    const questions = await Question.find();
    const answers = req.body.answers || {};

    let correct = 0;
    questions.forEach(q => {
        if (answers[q._id] === q.correct) correct++;
    });

    await Result.create({
        studentId: req.session.student._id,
        name: req.session.student.email,
        displayName: req.session.student.displayName,
        examNumber: config.currentExam,
        answers,
        score: correct,
        correct,
        wrong: Object.keys(answers).length - correct,
        notAttended: questions.length - Object.keys(answers).length,
        totalQuestions: questions.length,
        published: false,
    });

    // ✅ clear exam state
    req.session.examStarted = false;
    req.session.examStartTime = null;

    // ⚠️ IMPORTANT: beacon requests don't wait
    if (req.headers["content-type"] === "application/json") {
        return res.json({ success: true });
    }

    res.json({ success: true, msg: "Exam submitted successfully" });
});

/* ------------------ VIEW RESULT (PAGE) ------------------ */
app.get("/view-result", async (req, res) => {
    if (!req.session.student) return res.redirect("/login");

    const config = await getConfig();
    if (!config.resultPublished)
        return res.send("Results not yet published by admin.");

    const result = await Result.findOne({
        name: req.session.student.email,
        published: true
    }).sort({ examNumber: -1 });

    if (!result) return res.send("No result found.");

    res.render("view-result", { result });
});


/* ------------------ API: MY RESULT ------------------ */
app.get("/api/my-result", async (req, res) => {
    if (!req.session.student)
        return res.json({ success: false, message: "Not logged in" });

    const config = await getConfig();
    if (!config.resultPublished)
        return res.json({ success: false, message: "Result not published yet" });

    const result = await Result.findOne({
        studentId: req.session.student._id,
        examNumber: config.currentExam,
        published: true,
    });

    if (!result)
        return res.json({ success: false, message: "No result found" });

    res.json({ success: true, result });
});

/* ------------------ ADMIN ------------------ */
app.get("/admin/login", (req, res) => {
    res.render("admin-login", { message: null });
});

app.post("/admin/login", (req, res) => {
    const { email, password } = req.body;

    if (email === "parakkaloneboy@gmail.com" && password === "People786@") {
        req.session.admin = true;
        return res.redirect("/admin");
    }

    res.render("admin-login", { message: "Invalid credentials" });
});

app.get("/admin", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    const config = await getConfig();
    const results = await Result.find({ examNumber: config.currentExam });

    res.render("admin", { config, results });
});
// GET add-question page
app.get("/admin/add-question", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    // Count questions per part
    const countA = await Question.countDocuments({ part: "partA" });
    const countB = await Question.countDocuments({ part: "partB" });

    // Determine message if both parts completed
    let message = null;
    if (countA >= 25 && countB >= 75) {
        message = "Part A and Part B already completed.";
    }

    res.render("add-question", {
        countA,
        countB,
        lastSelectedPart: null, // optional, you can set default selection
        message,
        messageType: "success"
    });
});
app.get("/admin/view-questions", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    const questions = await Question.find(); // fetch all questions
    res.render("view-questions", { questions });
});
// GET edit question page
app.get("/admin/edit-question/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    const question = await Question.findById(req.params.id);
    if (!question) return res.send("Question not found.");

    res.render("edit-question", { question, message: null, messageType: "success" });
});
// POST edit question
app.post("/admin/edit-question/:id", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    try {
        await Question.findByIdAndUpdate(req.params.id, {
            part: req.body.part,
            question: req.body.question,
            optionA: req.body.optionA,
            optionB: req.body.optionB,
            optionC: req.body.optionC,
            optionD: req.body.optionD,
            correct: req.body.correct
        });

        res.json({ msg: "Question updated successfully", success: true });
    } catch (err) {
        console.error(err);
        res.json({ msg: "Failed to update question", success: false });
    }
});





// POST add-question

app.post("/admin/add-question", async (req, res) => {
    if (!req.session.admin)
        return res.json({ success: false, msg: "Unauthorized" });

    const { part, question, optionA, optionB, optionC, optionD, correct } = req.body;

    if (!part) return res.json({ success: false, msg: "Please select a part." });

    // Check limits
    const countA = await Question.countDocuments({ part: "partA" });
    const countB = await Question.countDocuments({ part: "partB" });

    if ((part === "partA" && countA >= 25) || (part === "partB" && countB >= 75)) {
        const completedParts = [];
        if (countA >= 25) completedParts.push("Part A");
        if (countB >= 75) completedParts.push("Part B");
        return res.json({ success: false, msg: `${completedParts.join(" and ")} already completed.` });
    }

    try {
        await Question.create({ part, question, optionA, optionB, optionC, optionD, correct });

        // Get updated counts
        const newCountA = await Question.countDocuments({ part: "partA" });
        const newCountB = await Question.countDocuments({ part: "partB" });

        res.json({ 
            success: true, 
            msg: "Question added successfully", 
            countA: newCountA, 
            countB: newCountB 
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, msg: "Failed to add question" });
    }
});

// GET edit question page








/* ------------------ ADMIN ACTIONS ------------------ */
app.post("/admin/start", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    const config = await getConfig();
    config.examStarted = true;
    config.examStopped = false;
    await config.save();

    res.json({ msg: "Exam started" });
});

app.post("/admin/stop", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    const config = await getConfig();
    config.examStopped = true;
    await config.save();

    res.json({ msg: "Exam stopped" });
});

app.post("/admin/publish", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    const config = await getConfig();
    config.resultPublished = true;
    await config.save();

    await Result.updateMany(
        { examNumber: config.currentExam },
        { published: true }
    );

    res.json({ msg: "Results published" });
});

app.post("/admin/next", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    const config = await getConfig();
    config.currentExam += 1;
    config.examStarted = false;
    config.examStopped = false;
    config.resultPublished = false;
    await config.save();

    res.json({ msg: "Moved to next exam" });
});
// Delete all questions
// Delete all questions
app.delete("/admin/delete-all", async (req, res) => {
    if (!req.session.admin) return res.json({ msg: "Unauthorized" });

    try {
        await Question.deleteMany({});
        res.json({ msg: "All questions deleted successfully." });
    } catch (err) {
        console.error(err);
        res.json({ msg: "Error deleting questions." });
    }
});

app.get("/admin/download-marklist", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    // Get current exam number
    const config = await getConfig();
    const currentExam = config.currentExam;

    // Fetch ONLY current exam results
    const results = await Result.find({ examNumber: currentExam }).sort({ createdAt: -1 });

    if (results.length === 0) {
        return res.send("No results available for current exam.");
    }

    // CSV header (NO exam column)
    let csv = "Name,Score,Correct,Wrong,Not Attempted,Total Questions\n";

    results.forEach(r => {
        csv += `"${r.displayName || r.name}",${r.score},${r.correct},${r.wrong},${r.notAttended},${r.totalQuestions}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=exam_${currentExam}_marklist.csv`
    );

    res.send(csv);
});


/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);

