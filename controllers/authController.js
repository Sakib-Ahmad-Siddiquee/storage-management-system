const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const generate6DigitCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit random code

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "6h" });
};

// Signup
exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userName, email, password } = req.body;
  try {
    // Check if userName or email already exists
    const existingUser = await User.findOne({
      $or: [{ userName }, { email }],
    });

    if (existingUser) {
      const takenField =
        existingUser.userName === userName ? "userName" : "email";
      return res.status(400).json({
        error: `${takenField} already exists. Please choose a different ${takenField}.`,
      });
    }

    // Create and save the user
    const user = new User({ userName, email, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    await sendEmail(
      email,
      "Account Created",
      `Your account has been created successfully. If you don't created this account then email us at hello@sakibahmad.com`
    );

    res.status(201).json({ message: "User created successfully", token });
  } catch (error) {
    res.status(500).json({ error: "User creation failed", details: error });
  }
};

// Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken(user._id);
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate reset token and 6-digit code
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetCode = generate6DigitCode();

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset link and code via email
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `Reset your password using the following link: ${resetUrl}\nYour 6-digit verification code is: ${resetCode} (This code will expire in 1 hour)`
    );

    res
      .status(200)
      .json({ message: "Password reset link and code sent to your email" });
  } catch (error) {
    res.status(500).json({ error: "Error sending reset email" });
  }
};

//Verify 6 Digit Code
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() }, // Ensure the code hasn't expired
    });

    if (!user)
      return res.status(400).json({ error: "Invalid or expired code" });

    res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error verifying reset code" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { email, code, newPassword } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Token expiration validation
      resetCode: code, // Ensure the code matches
      resetCodeExpires: { $gt: Date.now() }, // Code expiration validation
    });

    if (!user)
      return res
        .status(400)
        .json({ error: "Invalid or expired token or code" });

    // Update the user's password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;

    await user.save();

    await sendEmail(
      user.email,
      "Password Reset Successfull",
      `Your Password has been resetted successfully`
    );

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error resetting password" });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting account", details: error });
  }
};

// Edit Profile
exports.editProfile = async (req, res) => {
  const { userName } = req.body;

  if (!userName) {
    return res.status(400).json({ error: "User name is required" });
  }

  try {
    // Check if the userName is already in use
    const existingUser = await User.findOne({ userName });
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({ error: "User name is already taken" });
    }

    // Update userName
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { userName },
      { new: true } // Return the updated user document
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        userName: updatedUser.userName,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating profile", details: error });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Both current and new password are required" });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error changing password", details: error });
  }
};
