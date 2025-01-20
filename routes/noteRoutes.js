const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const noteController = require("../controllers/noteController");

const router = express.Router();

// Create a note
router.post("/create", protect, noteController.createNote);

// Edit a note
router.put("/edit/:noteId", protect, noteController.editNote);

// Delete notes (one or multiple)
router.delete("/delete", protect, noteController.deleteNotes);

// Rename a note title
router.patch("/rename", protect, noteController.renameNoteTitle);

// Get all notes
router.get("/getAll", protect, noteController.getAllNotes);

// Get note content by note ID
router.get("/getContent", protect, noteController.getNoteById);

module.exports = router;
