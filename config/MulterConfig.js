const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const log = require('./logger');
const storage = multer.memoryStorage();
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile');
const SERVER_URL = process.env.SERVER_URL;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: storage,
  limits: 5 * 1024 * 1024,
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
    const file = req.file;
    if (!file) {
      log.error(`[File] No files found ${file}`);
      return next();
    }
    const filename = `${req.user.name}-${Date.now()}.webp`;
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

    req.processedFile = {
      filename,
      originalName: file.originalname,
      path: `${SERVER_URL}/${outputPath}`,
      mimetype: 'image/webp',
      size: fs.statSync(outputPath).size,
      publicPath: `${SERVER_URL}/uploads/profile/${filename}`,
    };

    log.info(`[File Processed] ${filename}`);
    next();
  } catch (err) {
    log.error('Image conversion error:', err);
    if (req.file && req.file.buffer) {
      req.file.buffer = null;
    }
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
    if (!req.file || !req.user || !req.user.avatar) {
      log.info('[File] No cleanup needed - missing file, user, or avatar');
      return next();
    }

    let oldAvatarPath = req.user.avatar.trim();
    log.info(`[File] Processing old avatar: "${oldAvatarPath}"`);
    let relativePath = oldAvatarPath;
    if (SERVER_URL && relativePath.startsWith(SERVER_URL)) {
      relativePath = relativePath.replace(SERVER_URL, '');
    }

    relativePath = relativePath.replace(/^\/+/, '');

    if (!relativePath.startsWith('uploads/')) {
      if (relativePath.includes('uploads/')) {
        relativePath = relativePath.substring(relativePath.indexOf('uploads/'));
      } else {
        log.warn(`[File] Unexpected avatar path format: ${relativePath}`);
        return next();
      }
    }

    const fullPath = path.resolve(__dirname, '..', relativePath);
    log.info(`[File] Attempting to delete: "${fullPath}"`);

    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      const stats = await fs.promises.stat(fullPath);

      if (stats.isFile()) {
        await fs.promises.unlink(fullPath);
        log.info(`[File] ✅ Successfully deleted old avatar`);
      } else {
        log.warn(`[File] ⚠️ Path exists but is not a file: ${fullPath}`);
      }
    } catch (fileErr) {
      if (fileErr.code === 'ENOENT') {
        log.info(`[File] ℹ️ Old avatar file not found (already deleted?): ${fullPath}`);
      } else {
        log.error(`[File] ❌ Failed to delete old avatar: ${fileErr.message}`);
        log.debug(`[File] Error details:`, fileErr);
      }
    }

    next();
  } catch (err) {
    log.error('[File] Unexpected error in cleanup:', err);
    next();
  }
};
const cleanupFailedUpload = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log.info(`[File] Cleaned up failed upload: ${filePath}`);
    }
  } catch (err) {
    log.error('[File] Error cleaning up failed upload:', err);
  }
};

module.exports = {
  upload,
  convertToWebp,
  handleMulterError,
  cleanupOldAvatar,
  cleanupFailedUpload,
};
