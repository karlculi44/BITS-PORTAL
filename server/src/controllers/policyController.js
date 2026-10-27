import * as policyService from "../services/policyService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const getAllPoliciesController = asyncHandler(async (req, res) => {
  const policies = await policyService.getAllPolicies();
  res.status(200).json(policies);
});

export const createPolicyController = asyncHandler(async (req, res) => {
  const policy = await policyService.createPolicy(req.body);

  res.status(201).json({
    message: "Policy created successfully",
    data: policy,
  });
});

export const updatePolicyController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    throw new AppError("Invalid policy ID", 400);
  }

  const policy = await policyService.updatePolicy(id, req.body);

  res.status(200).json({
    message: "Policy updated successfully",
    data: policy,
  });
});
