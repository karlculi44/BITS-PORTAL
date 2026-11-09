import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import AppError from "../utils/AppError.js";
import {
  policyDocumentDirectory,
  removePolicyDocument,
} from "../utils/policyDocument.js";

export const maxPolicyDocumentSize = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    mkdir(policyDocumentDirectory, { recursive: true })
      .then(() => callback(null, policyDocumentDirectory))
      .catch(callback);
  },
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxPolicyDocumentSize, files: 1 },
  fileFilter: (req, file, callback) => {
    if (
      path.extname(file.originalname).toLowerCase() !== ".pdf" ||
      file.mimetype !== "application/pdf"
    ) {
      callback(new AppError("Only PDF documents are allowed.", 400));
      return;
    }

    callback(null, true);
  },
});

export const hasValidPdfSignature = (buffer) =>
  buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));

const handleUploadError = (error) => {
  if (!(error instanceof multer.MulterError)) return error;

  if (error.code === "LIMIT_FILE_SIZE") {
    return new AppError("Policy documents must be 10 MB or smaller.", 413);
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Upload one PDF document using the document field.", 400);
  }

  return new AppError("Unable to process the policy document upload.", 400);
};

const policyDocumentUpload = (req, res, next) => {
  upload.single("document")(req, res, async (uploadError) => {
    if (uploadError) {
      next(handleUploadError(uploadError));
      return;
    }

    if (!req.body) req.body = {};
    delete req.body.file;
    req.removeUploadedFile = removePolicyDocument;

    if (!req.file) {
      next();
      return;
    }

    try {
      const file = await readFile(req.file.path);

      if (!hasValidPdfSignature(file)) {
        throw new AppError(
          "The uploaded file does not contain a valid PDF document.",
          400,
        );
      }

      req.body.file = req.file.filename;
      next();
    } catch (error) {
      try {
        await removePolicyDocument(req.file.filename);
      } catch (cleanupError) {
        cleanupError.cause = error;
        next(cleanupError);
        return;
      }

      next(error);
    }
  });
};

export default policyDocumentUpload;
