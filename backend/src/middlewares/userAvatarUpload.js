import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import AppError from "../utils/AppError.js";
import { removeUserAvatar, userAvatarDirectory } from "../utils/userAvatar.js";
import {
  extensionMimeTypes,
  hasValidImageSignature,
} from "./serviceLogoUpload.js";

const maxFileSize = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    mkdir(userAvatarDirectory, { recursive: true })
      .then(() => callback(null, userAvatarDirectory))
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

const handleUploadError = (error) => {
  if (!(error instanceof multer.MulterError)) return error;

  if (error.code === "LIMIT_FILE_SIZE") {
    return new AppError("Profile pictures must be 2 MB or smaller.", 413);
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Upload one profile picture using the image field.", 400);
  }

  return new AppError("Unable to process the profile picture upload.", 400);
};

const userAvatarUpload = (req, res, next) => {
  upload.single("image")(req, res, async (uploadError) => {
    if (uploadError) {
      next(handleUploadError(uploadError));
      return;
    }

    // Only a validated uploaded file may set the image, never a body field.
    if (req.body) delete req.body.image;

    if (!req.file) {
      next();
      return;
    }

    // validate() uses this to delete the file when the request body is invalid.
    req.removeUploadedFile = removeUserAvatar;

    try {
      const file = await readFile(req.file.path);
      const extension = path.extname(req.file.filename).toLowerCase();

      if (!hasValidImageSignature(file, extension)) {
        throw new AppError(
          "The uploaded file does not contain a valid PNG, JPG, JPEG, or WebP image.",
          400,
        );
      }

      // Lets an image-only edit satisfy the "at least one field" schema rule.
      req.body.image = req.file.filename;
      next();
    } catch (error) {
      try {
        await removeUserAvatar(req.file.filename);
      } catch (cleanupError) {
        next(cleanupError);
        return;
      }

      next(error);
    }
  });
};

export default userAvatarUpload;
