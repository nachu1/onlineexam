// models/question.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
    part: { type: String, enum: ["partA", "partB"], required: true },
    question: { type: String, required: true },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correct: { type: String, enum: ["A", "B", "C", "D"], required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Question", QuestionSchema);
