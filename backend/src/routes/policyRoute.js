import { Router } from "express";
import {
  createPolicyController,
  deletePolicyController,
  getAllPoliciesController,
  getPolicyDocumentController,
  updatePolicyController,
} from "../controllers/policyController.js";
import {
  createPolicySchema,
  updatePolicySchema,
} from "../schemas/policySchema.js";
import validate from "../middlewares/validate.js";
import authorizeSection from "../middlewares/authorizeSection.js";
import verifyToken from "../middlewares/verifyToken.js";
import policyDocumentUpload from "../middlewares/policyDocumentUpload.js";
import validatePolicyId from "../middlewares/validatePolicyId.js";

const router = Router();

const normalizeMultipartNumbers = (req, res, next) => {
  if (
    req.is("multipart/form-data") &&
    typeof req.body.category_id === "string" &&
    req.body.category_id.trim() !== ""
  ) {
    req.body.category_id = Number(req.body.category_id);
  }

  next();
};

router.get(
  "/",
  verifyToken,
  authorizeSection("policies"),
  getAllPoliciesController,
);

router.get(
  "/:id/document",
  verifyToken,
  authorizeSection("policies"),
  validatePolicyId,
  getPolicyDocumentController,
);

router.post(
  "/",
  verifyToken,
  authorizeSection("policies"),
  policyDocumentUpload,
  normalizeMultipartNumbers,
  validate(createPolicySchema),
  createPolicyController,
);

router.patch(
  "/:id",
  verifyToken,
  authorizeSection("policies"),
  validatePolicyId,
  policyDocumentUpload,
  normalizeMultipartNumbers,
  validate(updatePolicySchema),
  updatePolicyController,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeSection("policies"),
  validatePolicyId,
  deletePolicyController,
);

export default router;
