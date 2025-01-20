const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const upload = require("../middleware/multerConfig");
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const Note = require("../models/noteModel");

exports.uploadFiles = async (req, res) => {
  const files = req.files; // Retrieve multiple files
  const { folderId } = req.body; // Optional: folder association

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    // Save each file
    const uploadedFiles = await Promise.all(
      files.map((file) => {
        const newFile = new File({
          name: file.originalname,
          url: file.path,
          folder: folderId || null,
          user: req.user.id,
          type: file.mimetype.includes("image") ? "image" : "pdf",
          size: file.size,
        });

        return newFile.save();
      })
    );

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    res.status(500).json({ error: "Error uploading files", details: error });
  }
};

//List Files by Folder
exports.getFilesByFolder = async (req, res) => {
  const { folderId } = req.params;

  try {
    const files = await File.find({ folder: folderId, user: req.user.id });
    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ error: "Error fetching files", details: error });
  }
};

//Delete Files
exports.deleteFiles = async (req, res) => {
  const { fileIds } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Please provide an array of file IDs" });
  }

  try {
    // Find files that belong to the logged-in user
    const files = await File.find({ _id: { $in: fileIds }, user: req.user.id });

    if (files.length !== fileIds.length) {
      return res.status(404).json({ error: "Some files not found" });
    }

    // Loop through the files, delete each file both from the database and file system
    for (const file of files) {
      const filePath = path.resolve(file.url);

      try {
        // Delete the file from the local file system
        await fs.promises.unlink(filePath);

        // Delete the file metadata from the database
        await File.deleteOne({ _id: file._id });
      } catch (err) {
        console.error("Error deleting file:", err);
        return res
          .status(500)
          .json({ error: "Error deleting file(s) from storage" });
      }
    }

    res.status(200).json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error("Error in deleteFiles:", error);
    res.status(500).json({ error: "Error deleting files", details: error });
  }
};

//Get All Files by User
exports.getAllFilesByUser = async (req, res) => {
  try {
    const files = await File.find({ user: req.user.id }); // Fetch all files for the authenticated user
    res.status(200).json(files);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching files by user", details: error });
  }
};

//Get All Files in the Root Folder
exports.getRootFiles = async (req, res) => {
  try {
    const files = await File.find({ folder: null, user: req.user.id }); // Files with no folder
    res.status(200).json(files);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching root files", details: error });
  }
};

// Get All Images
exports.getAllImages = async (req, res) => {
  try {
    const images = await File.find({
      user: req.user.id,
      type: "image", // Fetch files where type is "image"
    });
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ error: "Error fetching images", details: error });
  }
};

// Get All PDFs
exports.getAllPdf = async (req, res) => {
  try {
    const pdfFiles = await File.find({
      user: req.user.id,
      type: "pdf", // Fetch files where type is "pdf"
    });
    res.status(200).json(pdfFiles);
  } catch (error) {
    res.status(500).json({ error: "Error fetching PDFs", details: error });
  }
};

// Rename File
exports.renameFile = async (req, res) => {
  const { fileId, newName } = req.body; // Both fileId and newName in the request body

  // Validate inputs
  if (!fileId || typeof fileId !== "string") {
    return res.status(400).json({ error: "Please provide a valid file ID" });
  }

  if (!newName || typeof newName !== "string" || newName.trim() === "") {
    return res.status(400).json({ error: "Please provide a valid new name" });
  }

  try {
    const file = await File.findOne({ _id: fileId, user: req.user.id });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    file.name = newName;
    await file.save();

    res.status(200).json({ message: "File renamed successfully", file });
  } catch (error) {
    console.error("Error in renameFile:", error);
    res.status(500).json({ error: "Error renaming file", details: error });
  }
};

exports.getRecent = async (req, res) => {
  try {
    const userId = req.user.id;

    // last 10 files and folders
    const recentFiles = await File.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    const recentFolders = await Folder.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const combined = [...recentFiles, ...recentFolders].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const recentItems = combined.slice(0, 10);

    res.status(200).json({
      message: "Recent items retrieved successfully",
      recentItems,
    });
  } catch (error) {
    console.error("Error fetching recent items:", error);
    res
      .status(500)
      .json({ error: "Error fetching recent items", details: error });
  }
};

// Duplicate the entity (image, pdf, folder, or note)
exports.duplicate = async (req, res) => {
  const { entityId, entityType } = req.body; // entityType: 'image', 'pdf', 'folder', 'note'

  if (!["image", "pdf", "folder", "note"].includes(entityType)) {
    return res.status(400).json({ error: "Invalid entity type" });
  }

  try {
    let entity;

    // Handle File (Image / PDF)
    if (entityType === "image" || entityType === "pdf") {
      // Find the file
      entity = await File.findOne({ _id: entityId, user: req.user.id });
      if (!entity) {
        return res.status(404).json({ error: "File not found" });
      }

      // Create a duplicate of the file with the new name `[filename]-copy.extension`
      const fileCopy = new File({
        user: req.user.id,
        name: `${entity.name.split(".")[0]}-copy.${entity.name.split(".")[1]}`,
        type: entity.type,
        folder: entity.folder, // Stay in the same folder
        favourite: false,
        size: entity.size,
        createdAt: new Date(),
        content: entity.content, // Assuming `content` field has the file content/data
      });

      await fileCopy.save();

      return res.status(200).json({
        message: "File duplicated successfully",
        file: fileCopy,
      });
    }

    // Handle Folder
    if (entityType === "folder") {
      // Find the folder
      entity = await Folder.findOne({ _id: entityId, user: req.user.id });
      if (!entity) {
        return res.status(404).json({ error: "Folder not found" });
      }

      // Duplicate the folder
      const folderCopy = new Folder({
        user: req.user.id,
        name: `${entity.name}-copy`,
        parentFolder: entity.parentFolder, // Remain in the same parent folder
      });

      await folderCopy.save();

      // Duplicate items inside the folder (recursively)
      const filesInFolder = await File.find({
        folder: entity._id,
        user: req.user.id,
      });
      const notesInFolder = await Note.find({
        folder: entity._id,
        user: req.user.id,
      });

      // Duplicate files in the folder
      const fileCopies = filesInFolder.map(async (file) => {
        const fileCopy = new File({
          user: req.user.id,
          name: `${file.name.split(".")[0]}-copy.${file.name.split(".")[1]}`,
          type: file.type,
          folder: folderCopy._id, // Put the duplicate in the new folder
          favourite: file.favourite,
          size: file.size,
          createdAt: new Date(),
          content: file.content,
        });

        await fileCopy.save();
      });

      // Duplicate notes in the folder
      const noteCopies = notesInFolder.map(async (note) => {
        const noteCopy = new Note({
          user: req.user.id,
          title: `${note.title}-copy`,
          content: note.content,
          folder: folderCopy._id, // Put the duplicate in the new folder
          favourite: note.favourite,
        });

        await noteCopy.save();
      });

      // Wait for all duplications to complete
      await Promise.all([...fileCopies, ...noteCopies]);

      return res.status(200).json({
        message: "Folder and its contents duplicated successfully",
        folder: folderCopy,
      });
    }

    // Handle Note
    if (entityType === "note") {
      // Find the note
      entity = await Note.findOne({ _id: entityId, user: req.user.id });
      if (!entity) {
        return res.status(404).json({ error: "Note not found" });
      }

      // Create a duplicate note
      const noteCopy = new Note({
        user: req.user.id,
        title: `${entity.title}-copy`,
        content: entity.content,
        folder: entity.folder, // Stay in the same folder
        favourite: false,
      });

      await noteCopy.save();

      return res.status(200).json({
        message: "Note duplicated successfully",
        note: noteCopy,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Error duplicating entity",
      details: error.message || error,
    });
  }
};

//Get All Files by Date
exports.getFilesByDate = async (req, res) => {
  const { date } = req.body; // 'YYYY-MM-DD' format

  // Validate the date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use 'YYYY-MM-DD' format" });
  }

  try {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const files = await File.find({
      user: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const folders = await Folder.find({
      user: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const notes = await Note.find({
      user: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    //Combine
    const results = [...files, ...folders, ...notes];

    res.status(200).json({
      message: "Files retrieved successfully for the selected date",
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching entities for the given date",
      details: error.message || error,
    });
  }
};
