// models/result.js
// models/Result.js
const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  name: { type: String, required: true },         // email (legacy)
  displayName: { type: String },                  // the name student typed on dashboard
  examNumber: { type: Number, required: true },
  answers: { type: Object, default: {} },
  score: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  notAttended: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  published: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Result", ResultSchema);
