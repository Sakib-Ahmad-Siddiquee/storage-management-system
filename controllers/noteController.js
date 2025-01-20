const Note = require("../models/noteModel"); // Note schema model

// Create Notes
exports.createNote = async (req, res) => {
  const { title, content, folderId } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    const newNote = new Note({
      title,
      content,
      folder: folderId || null, // Optional: Folder association
      user: req.user.id,
    });

    const savedNote = await newNote.save();

    res
      .status(201)
      .json({ message: "Note created successfully", note: savedNote });
  } catch (error) {
    res.status(500).json({ error: "Error creating note", details: error });
  }
};

// Edit Notes
exports.editNote = async (req, res) => {
  const { noteId } = req.params;
  const { title, content } = req.body;

  try {
    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId, user: req.user.id },
      { title, content, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    res
      .status(200)
      .json({ message: "Note updated successfully", note: updatedNote });
  } catch (error) {
    res.status(500).json({ error: "Error updating note", details: error });
  }
};

// Delete Notes (one or multiple)
exports.deleteNotes = async (req, res) => {
  const { noteIds } = req.body; // Array of note IDs

  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return res.status(400).json({ error: "Note IDs are required" });
  }

  try {
    const deletedNotes = await Note.deleteMany({
      _id: { $in: noteIds },
      user: req.user.id,
    });

    res.status(200).json({
      message: `${deletedNotes.deletedCount} note(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ error: "Error deleting notes", details: error });
  }
};

// Rename Notes Title
exports.renameNoteTitle = async (req, res) => {
  const { noteId, newTitle } = req.body;

  // Validate inputs
  if (!noteId || typeof noteId !== "string") {
    return res.status(400).json({ error: "Please provide a valid Note ID" });
  }

  if (!newTitle) {
    return res.status(400).json({ error: "New title is required" });
  }

  try {
    const renamedNote = await Note.findOneAndUpdate(
      { _id: noteId, user: req.user.id },
      { title: newTitle, updatedAt: Date.now() },
      { new: true }
    );

    if (!renamedNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    res
      .status(200)
      .json({ message: "Note title renamed successfully", note: renamedNote });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error renaming note title", details: error });
  }
};

// Get All Notes
exports.getAllNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notes", details: error });
  }
};

// Get Notes Content by Note ID
exports.getNoteById = async (req, res) => {
  const { noteId } = req.body;

  // Validate inputs
  if (!noteId || typeof noteId !== "string") {
    return res.status(400).json({ error: "Please provide a valid Note ID" });
  }

  try {
    const note = await Note.findOne({ _id: noteId, user: req.user.id });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ error: "Error fetching note", details: error });
  }
};
