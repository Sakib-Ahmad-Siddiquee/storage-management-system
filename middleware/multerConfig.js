const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";

    // Ensure the upload directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`); // Unique filename
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new Error(
        "Invalid file type. Only images (.jpg, .jpeg, .png, .webp) and PDF files are allowed."
      ),
      false
    );
  }
};

// Multer setup with file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 512 * 1024 * 1024 }, // 512MB file size limit
  fileFilter: fileFilter, // Apply the file filter
});

// Export the multer instance for reuse
module.exports = upload;
