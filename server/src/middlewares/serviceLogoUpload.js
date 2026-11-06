import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import AppError from "../utils/AppError.js";
import {
  removeServiceLogo,
  serviceLogoDirectory,
} from "../utils/serviceLogo.js";

const maxFileSize = 2 * 1024 * 1024;
const extensionMimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    mkdir(serviceLogoDirectory, { recursive: true })
      .then(() => callback(null, serviceLogoDirectory))
      .catch(callback);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extensionMimeTypes[extension] !== file.mimetype) {
      callback(
        new AppError("Only PNG, JPG, JPEG, and WebP images are allowed.", 400),
      );
      return;
    }

    callback(null, true);
  },
});

const hasValidImageSignature = (buffer, extension) => {
  if (extension === ".png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  return (
    extension === ".webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
};

const handleUploadError = (error) => {
  if (!(error instanceof multer.MulterError)) return error;

  if (error.code === "LIMIT_FILE_SIZE") {
    return new AppError("Service logos must be 2 MB or smaller.", 413);
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Upload one service logo using the image field.", 400);
  }

  return new AppError("Unable to process the service logo upload.", 400);
};

const serviceLogoUpload = (req, res, next) => {
  upload.single("image")(req, res, async (uploadError) => {
    if (uploadError) {
      next(handleUploadError(uploadError));
      return;
    }

    if (!req.file) {
      next();
      return;
    }

    try {
      const file = await readFile(req.file.path);
      const extension = path.extname(req.file.filename).toLowerCase();

      if (!hasValidImageSignature(file, extension)) {
        throw new AppError(
          "The uploaded file does not contain a valid PNG, JPG, JPEG, or WebP image.",
          400,
        );
      }

      req.body.image = req.file.filename;
      next();
    } catch (error) {
      try {
        await removeServiceLogo(req.file.filename);
      } catch (cleanupError) {
        next(cleanupError);
        return;
      }

      next(error);
    }
  });
};

export default serviceLogoUpload;
