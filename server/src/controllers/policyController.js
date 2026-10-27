import * as policyService from "../services/policyService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createPolicyController = asyncHandler(async (req, res) => {
  const policy = await policyService.createPolicy(req.body);

  res.status(201).json({
    message: "Policy created successfully",
    data: policy,
  });
});
