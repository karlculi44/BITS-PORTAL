import * as policyModel from "../models/policyModel.js";
import AppError from "../utils/AppError.js";
import { withAuditTransaction } from "./auditLogService.js";
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

export const createPolicy = async (policy, context) => {
  try {
    const category = await policyModel.getCategoryById(policy.category_id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.type !== "policy") {
      throw new AppError("Category must be a policy category", 400);
    }

    const createdPolicy = context
      ? await withAuditTransaction(context, "Add", "Policies",
        (db) => policyModel.insertPolicy(policy, db),
        (created) => `Added policy: ${created.title}`)
      : await policyModel.insertPolicy(policy);

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

export const updatePolicy = async (policyId, policy, context) => {
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

    updatedPolicy = context
      ? await withAuditTransaction(context, "Edit", "Policies",
        (db) => policyModel.updatePolicy(policyId, policy, db),
        (updated) => {
          const changes = [];
          if (updated.previous_category_id !== undefined && updated.previous_category_id !== updated.category_id) changes.push("Changed category");
          if (updated.previous_file && updated.previous_file !== updated.file) changes.push("Replaced document");
          return changes.length
            ? `${changes.join("; ")} for policy: ${updated.title}`
            : `Updated policy: ${updated.title}`;
        })
      : await policyModel.updatePolicy(policyId, policy);

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

  const { previous_file: _previousFile, previous_category_id: _previousCategoryId, ...result } = updatedPolicy;
  return result;
};

export const deletePolicy = async (policyId, context) => {
  const policy = context
    ? await withAuditTransaction(context, "Delete", "Policies",
      (db) => policyModel.deletePolicy(policyId, db),
      (deleted) => `Deleted policy: ${deleted.title}`)
    : await policyModel.deletePolicy(policyId);

  if (!policy) {
    throw new AppError("Policy not found", 404);
  }

  await removeUnusedPolicyDocument(policy.file);

  return policy;
};
