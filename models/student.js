const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  examLocked:{
    type:Boolean,
    default:false
  },

}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
