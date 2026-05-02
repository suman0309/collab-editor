const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  id: String,
  name: String,
  code: String,
});

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  code: { type: String, default: "" },
  language: { type: String, default: "javascript" },
  files: [FileSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", SessionSchema);
