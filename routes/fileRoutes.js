const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/multerConfig");
const {
  uploadFiles,
  getFilesByFolder,
  deleteFiles,
  getAllFilesByUser,
  getRootFiles,
  getAllImages,
  getAllPdf,
  renameFile,
  getRecent,
  duplicate,
  getFilesByDate,
} = require("../controllers/fileController");

const router = express.Router();

// Upload files
router.post(
  "/upload",
  protect,
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        return res.status(400).json({ error: err.message });
      } else if (err) {
        // Handle other errors (e.g., invalid file types)
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadFiles
);

// List files by folder
router.get("/folder/:folderId", protect, getFilesByFolder);

// Delete a file
router.delete("/delete", protect, deleteFiles);

//Get all files by User
router.get("/user", protect, getAllFilesByUser);

// Get All files from root folder
router.get("/root", protect, getRootFiles);

//Get All Images
router.get("/images", protect, getAllImages);

//Get All Pdfs
router.get("/pdfs", protect, getAllPdf);

//Rename File Title
router.put("/rename", protect, renameFile);

//Fet Recent Files and Folders
router.get("/recent", protect, getRecent);

router.post("/duplicate", protect, duplicate);

//Get files by date
router.post("/getfilesbydate", protect, getFilesByDate);

module.exports = router;
