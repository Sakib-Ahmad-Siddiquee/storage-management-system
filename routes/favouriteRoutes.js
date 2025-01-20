const express = require("express");
const {
  toggleFavouriteMultiple,
  getFavourites,
  unfavouriteMultiple,
} = require("../controllers/favouriteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/toggle", protect, toggleFavouriteMultiple);

router.get("/list", protect, getFavourites);

router.post("/remove", protect, unfavouriteMultiple);

module.exports = router;
