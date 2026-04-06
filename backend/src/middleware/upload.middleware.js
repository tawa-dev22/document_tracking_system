import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const uploadDir = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const originalName = path.basename(file.originalname);
    const safeName = originalName.replace(/[^\w.-]/g, '_');
    const unique = `${Date.now()}-${safeName}`;
    cb(null, unique);
  }
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]);

function fileFilter(_req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new ApiError(400, 'Unsupported file format'));
  }
  cb(null, true);
}

export const uploadSingleDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
}).single('file');
