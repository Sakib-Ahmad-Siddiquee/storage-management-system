const { body, validationResult } = require("express-validator");
const express = require("express");
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  verifyResetCode,
  deleteAccount,
  editProfile,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/userModel");

const router = express.Router();

// Validation rules
const validateSignup = [
  body("userName")
    .notEmpty()
    .withMessage("User name is required")
    .custom(async (value) => {
      const existingUser = await User.findOne({ userName: value });
      if (existingUser) {
        throw new Error("User name is already taken");
      }
      return true;
    }),
  body("email")
    .isEmail()
    .withMessage("Email is invalid")
    .custom(async (value) => {
      const existingUser = await User.findOne({ email: value });
      if (existingUser) {
        throw new Error("Email is already registered");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Email is invalid"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
];

// Signup route
router.post("/signup", validateSignup, signup);

// Login route
router.post("/login", validateLogin, login);

router.get("/profile", protect, (req, res) => {
  res.status(200).json({ message: `Welcome: ${req.user.userName}` });
});

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token", resetPassword);

router.post("/verify-reset-code", verifyResetCode);

router.delete("/delete-account", protect, deleteAccount);

router.put("/edit-profile", protect, editProfile);

router.post(
  "/change-password",
  protect,
  validateChangePassword,
  changePassword
);

module.exports = router;
