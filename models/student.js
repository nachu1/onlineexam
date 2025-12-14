// models/Student.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  // removed password field as requested — signup/login by email only
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
