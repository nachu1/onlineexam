// models/config.js
const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema({
  examStarted: { type: Boolean, default: false },
  examStopped: { type: Boolean, default: false },
  resultPublished: { type: Boolean, default: false },
  currentExam: { type: Number, default: 1 },
  partACompleted: { type: Boolean, default: false },
  partBCompleted: { type: Boolean, default: false }
});

module.exports = mongoose.model("Config", ConfigSchema);
