const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const Note = require("../models/noteModel");
const path = require("path");
const fs = require("fs");

//Create Folder
exports.createFolder = async (req, res) => {
  const { name, parentFolderId } = req.body;

  try {
    const newFolder = new Folder({
      name,
      parentFolder: parentFolderId || null, // Null means it's a root folder
      user: req.user.id,
    });

    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ error: "Error creating folder", details: error });
  }
};

//List Contents of a Folder (Files + Notes + Sub-Folders)
exports.listFolderContents = async (req, res) => {
  const { folderId } = req.params;

  try {
    const folders = await Folder.find({
      parentFolder: folderId || null,
      user: req.user.id,
    });
    const files = await File.find({
      folder: folderId || null,
      user: req.user.id,
    });
    const notes = await Note.find({
      folder: folderId || null,
      user: req.user.id,
    });

    res.status(200).json({ folders, files, notes });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching folder contents", details: error });
  }
};

//Delete Folder (with all contents inside)
exports.deleteFolders = async (req, res) => {
  const { folderIds } = req.body; // Expect an array of folder IDs in the request body

  if (!Array.isArray(folderIds) || folderIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Please provide an array of folder IDs" });
  }

  try {
    // Helper function to delete a folder and its contents recursively
    const deleteFolderAndContents = async (folderId) => {
      const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
      if (!folder) throw new Error(`Folder with ID ${folderId} not found`);

      const subFolders = await Folder.find({ parentFolder: folderId });
      for (const subFolder of subFolders) {
        await deleteFolderAndContents(subFolder._id); // Recursive deletion
      }

      const files = await File.find({ folder: folderId });
      for (const file of files) {
        const filePath = path.resolve(file.url); // Resolve full file path
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Delete file from storage
        }
      }

      // Delete files, notes, and the folder itself
      await File.deleteMany({ folder: folderId });
      await Note.deleteMany({ folder: folderId });
      await Folder.findByIdAndDelete(folderId);
    };

    // Iterate over the folderIds array and delete each folder
    for (const folderId of folderIds) {
      await deleteFolderAndContents(folderId);
    }

    res
      .status(200)
      .json({ message: "Folders and their contents deleted successfully" });
  } catch (error) {
    console.error("Error in deleteFolders:", error);
    res
      .status(500)
      .json({ error: "Error deleting folders", details: error.message });
  }
};

//Rename Folder
exports.renameFolder = async (req, res) => {
  const { folderId, newName } = req.body;

  try {
    const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
    if (!folder) return res.status(404).json({ error: "Folder not found" });

    folder.name = newName;
    await folder.save();

    res.status(200).json({ message: "Folder renamed successfully", folder });
  } catch (error) {
    res.status(500).json({ error: "Error renaming folder", details: error });
  }
};
