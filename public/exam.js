// public/exam.js
(async function () {
  let studentName = localStorage.getItem("studentName");

  if (!studentName) {
    const p = prompt("Enter your name:");
    if (!p) { 
      window.location = "/"; 
      return; 
    }
    studentName = p;
    localStorage.setItem("studentName", studentName);
  }

  const form = document.getElementById("examForm");
  const viewBtn = document.getElementById("viewResultBtn");

  // -------- ON SUBMIT --------
  form.onsubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const answers = {};
    for (let [k, v] of fd.entries()) answers[k] = v;

    try {
      const r = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentName, answers })
      });

      const jr = await r.json();

      // ---------------- YOUR CHANGE ADDED HERE ----------------
      if (jr.success) {
        alert("🎉 Exam submitted! Wait for the result.");
        window.location = "/dashboard";
      } else {
        alert(jr.msg || "Exam submitted. Wait for result.");
        window.location = "/";
      }
      // ---------------------------------------------------------

    } catch (err) {
      console.error(err);
      alert("Error submitting exam. Check console.");
    }
  };

  // -------- VIEW RESULT --------
  if (viewBtn) {
    viewBtn.onclick = async () => {
      try {
        const r = await fetch(`/api/result?name=${encodeURIComponent(studentName)}`);
        const jr = await r.json();

        if (jr.msg) {
          alert(jr.msg);
        } else {
          alert(
            `Score: ${jr.score}\nCorrect: ${jr.correct}\nWrong: ${jr.wrong}\nNot Attempted: ${jr.notAttended}\nTotal Questions: ${jr.totalQuestions}`
          );
        }
      } catch (err) {
        console.error(err);
        alert("Error checking result. Check console.");
      }
    };
  }
})();






