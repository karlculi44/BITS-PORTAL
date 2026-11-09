import * as policyModel from "../models/policyModel.js";
import AppError from "../utils/AppError.js";
import {
  isManagedPolicyDocument,
  removePolicyDocument,
} from "../utils/policyDocument.js";

const removeUnusedPolicyDocument = async (file) => {
  if (
    isManagedPolicyDocument(file) &&
    !(await policyModel.isPolicyDocumentReferenced(file))
  ) {
    await removePolicyDocument(file);
  }
};

const removeUploadedPolicyDocument = async (file, cause) => {
  if (!isManagedPolicyDocument(file)) return;

  try {
    await removePolicyDocument(file);
  } catch (cleanupError) {
    cleanupError.cause = cause;
    throw cleanupError;
  }
};

export const getAllPolicies = async () => {
  return await policyModel.getAllPolicies();
};

export const getPolicyById = async (policyId) => {
  const policy = await policyModel.getPolicyById(policyId);

  if (!policy) {
    throw new AppError("Policy not found", 404);
  }

  return policy;
};

export const createPolicy = async (policy) => {
  try {
    const category = await policyModel.getCategoryById(policy.category_id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.type !== "policy") {
      throw new AppError("Category must be a policy category", 400);
    }

    const createdPolicy = await policyModel.insertPolicy(policy);

    if (createdPolicy) return createdPolicy;

    const currentCategory = await policyModel.getCategoryById(
      policy.category_id,
    );

    if (!currentCategory) {
      throw new AppError("Category not found", 404);
    }

    if (currentCategory.type !== "policy") {
      throw new AppError("Category must be a policy category", 400);
    }

    throw new Error("Policy was not created");
  } catch (error) {
    await removeUploadedPolicyDocument(policy.file, error);

    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }
};

export const updatePolicy = async (policyId, policy) => {
  const validateCategory = async () => {
    const category = await policyModel.getCategoryById(policy.category_id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.type !== "policy") {
      throw new AppError("Category must be a policy category", 400);
    }
  };

  let updatedPolicy;

  try {
    if (policy.category_id !== undefined) {
      await validateCategory();
    }

    updatedPolicy = await policyModel.updatePolicy(policyId, policy);

    if (!updatedPolicy) {
      if (policy.category_id !== undefined) {
        await validateCategory();
      }

      throw new AppError("Policy not found", 404);
    }
  } catch (error) {
    await removeUploadedPolicyDocument(policy.file, error);

    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }

  if (
    updatedPolicy.previous_file &&
    updatedPolicy.previous_file !== updatedPolicy.file
  ) {
    await removeUnusedPolicyDocument(updatedPolicy.previous_file);
  }

  if (!Object.hasOwn(updatedPolicy, "previous_file")) return updatedPolicy;

  const { previous_file: _previousFile, ...result } = updatedPolicy;
  return result;
};

export const deletePolicy = async (policyId) => {
  const policy = await policyModel.deletePolicy(policyId);

  if (!policy) {
    throw new AppError("Policy not found", 404);
  }

  await removeUnusedPolicyDocument(policy.file);

  return policy;
};
