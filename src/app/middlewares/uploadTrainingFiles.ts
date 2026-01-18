import path from "path";
import  fs  from 'fs';
import multer from "multer";

// Ensure uploads directory exists
// const UPLOADS_FOLDER = path.join(__dirname, "../uploads");
const UPLOADS_FOLDER = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}

// const VIDEO_FOLDER = path.join(__dirname, "../uploads/videos");
const VIDEO_FOLDER = path.join(UPLOADS_FOLDER, "videos");
// console.log("path = ",VIDEO_FOLDER)
if (!fs.existsSync(VIDEO_FOLDER)) {
  fs.mkdirSync(VIDEO_FOLDER, { recursive: true });
}

// Multer Storage Configuration for Videos and Thumbnails
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEO_FOLDER);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Multer middleware for video + thumbnail upload

export const uploadTrainingFiles = multer({
  storage: videoStorage,
  limits: { fileSize: Infinity },
  fileFilter: (req, file, cb) => {
    // console.log('File received:', file.fieldname, file.originalname);
    // console.log("filess to uploads = ",file)

    if (file.fieldname === "video_en" || file.fieldname === "video_es") {
      const allowedTypes = /mp4|avi|mov|mkv|wmv|flv|webm/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      return cb(new Error("Only video files (mp4, avi, mov, etc.) are allowed!"));
    }

    if (file.fieldname === "segment_thumbnail_en" || file.fieldname === "segment_thumbnail_es") {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      return cb(new Error("Only image files (jpg, png, gif, webp) are allowed for segment thumbnail!"));
    }

    if (file.fieldname === "video_thumbnail_en" || file.fieldname === "video_thumbnail_es") {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      return cb(new Error("Only image files (jpg, png, gif, webp) are allowed for video thumbnail!"));
    }

    cb(new Error(`Invalid file field: ${file.fieldname}`));
  },
}).fields([
  { name: 'segment_thumbnail_en', maxCount: 1 },
  { name: 'segment_thumbnail_es', maxCount: 1 },
  { name: 'video_en', maxCount: 20 },
  { name: 'video_es', maxCount: 20 },
  { name: 'video_thumbnail_en', maxCount: 20 },
  { name: 'video_thumbnail_es', maxCount: 20 },
]);
