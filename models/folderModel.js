const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder" }, // For nested folders
  favourite: { type: Boolean, default: false },
  type: { type: String, default: "folder" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Folder", folderSchema);
