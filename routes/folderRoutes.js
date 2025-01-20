const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createFolder,
  listFolderContents,
  deleteFolders,
  renameFolder,
} = require("../controllers/folderController");

const router = express.Router();

// Create a folder
router.post("/", protect, createFolder);

// List contents of a folder
router.get("/:folderId?", protect, listFolderContents); // FolderId is optional for root folders

// Delete a folder (and all contents inside)
router.delete("/delete", protect, deleteFolders);

// Rename a folder
router.put("/rename", protect, renameFolder);

module.exports = router;
