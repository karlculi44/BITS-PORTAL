import * as policyService from "../services/policyService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getPolicyDocumentPath } from "../utils/policyDocument.js";
import { requestAuditContext } from "../services/auditLogService.js";

export const getAllPoliciesController = asyncHandler(async (req, res) => {
  const policies = await policyService.getAllPolicies();
  res.status(200).json(
    policies.map((policy) => ({
      ...policy,
      file: typeof policy.file === "string" ? policy.file.split(/[\\/]/).pop() : policy.file,
    })),
  );
});

export const getPolicyDocumentController = asyncHandler(async (req, res, next) => {
  const policy = await policyService.getPolicyById(req.params.id);
  const documentPath = getPolicyDocumentPath(policy.file);

  if (!documentPath) {
    throw new AppError("Policy document not found", 404);
  }

  res.type("application/pdf");
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(documentPath, (error) => {
    if (!error) return;

    next(
      error.statusCode === 404
        ? new AppError("Policy document not found", 404)
        : error,
    );
  });
});

export const createPolicyController = asyncHandler(async (req, res) => {
  const policy = await policyService.createPolicy(req.body, requestAuditContext(req));

  res.status(201).json({
    message: "Policy created successfully",
    data: policy,
  });
});

export const updatePolicyController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await policyService.updatePolicy(id, req.body, requestAuditContext(req));

  res.status(200).json({
    message: "Policy updated successfully",
    data: policy,
  });
});

export const deletePolicyController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await policyService.deletePolicy(id, requestAuditContext(req));

  res.status(200).json({
    message: "Policy deleted successfully",
    data: policy,
  });
});
