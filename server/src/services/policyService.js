import * as policyModel from "../models/policyModel.js";
import AppError from "../utils/AppError.js";

export const createPolicy = async (policy) => {
  const category = await policyModel.getCategoryById(policy.category_id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category.type !== "policy") {
    throw new AppError("Category must be a policy category", 400);
  }

  try {
    const createdPolicy = await policyModel.insertPolicy(policy);

    if (createdPolicy) {
      return createdPolicy;
    }

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

  if (policy.category_id !== undefined) {
    await validateCategory();
  }

  try {
    const updatedPolicy = await policyModel.updatePolicy(policyId, policy);

    if (!updatedPolicy) {
      if (policy.category_id !== undefined) {
        await validateCategory();
      }

      throw new AppError("Policy not found", 404);
    }

    return updatedPolicy;
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }
};
