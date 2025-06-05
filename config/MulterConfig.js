const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const constants = require('./constants');
const log = require('./logger');
const storage = multer.memoryStorage();
const uploadDir = path.join(__dirname, '..', 'uploads', 'tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: storage,
  limits: constants.FILE_SIZE_LIMIT,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
    const isImage = file.mimetype.startsWith('image/');
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    const isZip = allowedMimeTypes.includes(file.mimetype);
    if (!isImage && !isZip) {
      return cb(new Error('Only image or zip files are allowed'), false);
    }

    if (!allowedExtensions.includes(ext)) {
      return cb(
        new Error('Invalid file type. Only JPG, PNG, GIF, WebP, and ZIP are allowed'),
        false
      );
    }
    cb(null, true);
  },
});
const convertToWebp = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      log.error('[File] No files found');
      return next();
    }
    const processedFiles = [];
    for (const file of req.files) {
      log.info(`[File Reached] Converting ${file.originalname} to WebP`);
      const filename = `${uuidv4()}-${Date.now()}.webp`;
      const outputPath = path.join(uploadDir, filename);

      await sharp(file.buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const processedFile = {
        filename,
        originalName: file.originalname,
        path: `${constants.SERVER_URL}/${outputPath}`,
        mimetype: 'image/webp',
        size: fs.statSync(outputPath).size,
        publicPath: `${constants.SERVER_URL}/uploads/tasks/${filename}`,
      };

      processedFiles.push(processedFile);
      log.info(`[File Processed] ${filename}`);
    }

    req.processedFiles = processedFiles;
    next();
  } catch (err) {
    log.error('Image conversion error:', err);
    return res.status(500).json({
      success: false,
      message: 'Image processing failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum size is 5MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};
const cleanupOldAvatar = async (req, res, next) => {
  try {
    log.info('[File] Reached FOr Update and Delete old One');
    if (!req.file || !req.user || !req.user.avatar) {
      return next();
    }
    const oldAvatarPath = req.user.avatar;
    if (
      oldAvatarPath &&
      !oldAvatarPath.includes('default') &&
      oldAvatarPath.startsWith('/uploads/profile/')
    ) {
      const fullPath = path.join(__dirname, '..', oldAvatarPath);
      log.info('[File] Gotted your old one Now Deleting that :-');
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    log.success('[File] Deleted your old Avatar');
    next();
  } catch (err) {
    log.error('Error cleaning up old avatar:', err);
    next();
  }
};

module.exports = {
  upload,
  convertToWebp,
  handleMulterError,
  cleanupOldAvatar,
};
