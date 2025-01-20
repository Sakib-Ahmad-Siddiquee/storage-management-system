const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const Note = require("../models/noteModel");

// Toggle favourite for any entity
exports.toggleFavouriteMultiple = async (req, res) => {
  const { entityDetails } = req.body;

  if (!Array.isArray(entityDetails) || entityDetails.length === 0) {
    return res
      .status(400)
      .json({ error: "Entity details should be a non-empty array" });
  }

  try {
    const updatePromises = entityDetails.map(({ entityId, entityType }) => {
      if (!["image", "pdf", "folder", "note"].includes(entityType)) {
        return Promise.reject({ error: `Invalid entity type: ${entityType}` });
      }

      let model;
      if (entityType === "image" || entityType === "pdf") {
        model = File;
      } else if (entityType === "folder") {
        model = Folder;
      } else if (entityType === "note") {
        model = Note;
      }

      return model
        .findOne({ _id: entityId, user: req.user.id })
        .then((entity) => {
          if (!entity) {
            return Promise.reject({ error: `${entityType} not found` });
          }

          entity.favourite = !entity.favourite;
          return entity.save();
        });
    });

    const results = await Promise.all(updatePromises);

    res.status(200).json({
      message: "Entities updated successfully",
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error updating favourite status",
      details: error,
    });
  }
};

// Get all favourites
exports.getFavourites = async (req, res) => {
  try {
    const files = await File.find({ user: req.user.id, favourite: true });
    const folders = await Folder.find({ user: req.user.id, favourite: true });
    const notes = await Note.find({ user: req.user.id, favourite: true });

    const favourites = [...files, ...folders, ...notes];

    favourites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      message: "Favourites retrieved successfully",
      favourites,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching favourites",
      details: error,
    });
  }
};

// Unfavourite an entity
exports.unfavouriteMultiple = async (req, res) => {
  const { entityDetails } = req.body;

  if (!Array.isArray(entityDetails) || entityDetails.length === 0) {
    return res
      .status(400)
      .json({ error: "Entity details should be a non-empty array" });
  }

  try {
    const updatePromises = entityDetails.map(({ entityId, entityType }) => {
      if (!["image", "pdf", "folder", "note"].includes(entityType)) {
        return Promise.reject({ error: `Invalid entity type: ${entityType}` });
      }

      let model;
      if (entityType === "image" || entityType === "pdf") {
        model = File;
      } else if (entityType === "folder") {
        model = Folder;
      } else if (entityType === "note") {
        model = Note;
      }

      return model.updateOne(
        {
          _id: entityId,
          user: req.user.id,
        },
        {
          $set: { favourite: false },
        }
      );
    });

    const results = await Promise.all(updatePromises);

    res.status(200).json({
      message: "Entities removed from favourites successfully",
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error removing from favourites",
      details: error,
    });
  }
};
