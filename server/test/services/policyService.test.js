import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/policyModel.js", () => ({
  getAllPolicies: vi.fn(),
  getCategoryById: vi.fn(),
  deletePolicy: vi.fn(),
  insertPolicy: vi.fn(),
  updatePolicy: vi.fn(),
}));

import * as policyModel from "../../src/models/policyModel.js";
import {
  createPolicy,
  deletePolicy,
  getAllPolicies,
  updatePolicy,
} from "../../src/services/policyService.js";

const policyInput = {
  title: "Student Handbook",
  description: "Guidelines for students",
  file: "https://example.com/handbook.pdf",
  category_id: 11,
};

describe("policyService", () => {
  beforeEach(() => {
    policyModel.getAllPolicies.mockReset();
    policyModel.getCategoryById.mockReset();
    policyModel.deletePolicy.mockReset();
    policyModel.insertPolicy.mockReset();
    policyModel.updatePolicy.mockReset();
  });

  it("returns all policies from the model", async () => {
    const policies = [{ id: 5, title: "Student Handbook" }];
    policyModel.getAllPolicies.mockResolvedValueOnce(policies);

    await expect(getAllPolicies()).resolves.toBe(policies);
    expect(policyModel.getAllPolicies).toHaveBeenCalledOnce();
  });

  it("deletes an existing policy", async () => {
    const policy = { id: 5, title: "Student Handbook" };
    policyModel.deletePolicy.mockResolvedValueOnce(policy);

    await expect(deletePolicy("5")).resolves.toBe(policy);
    expect(policyModel.deletePolicy).toHaveBeenCalledWith("5");
  });

  it("returns not found when the policy does not exist", async () => {
    policyModel.deletePolicy.mockResolvedValueOnce(undefined);

    await expect(deletePolicy("99")).rejects.toMatchObject({
      message: "Policy not found",
      statusCode: 404,
    });
  });

  it("propagates unexpected delete errors", async () => {
    const error = new Error("Database unavailable");
    policyModel.deletePolicy.mockRejectedValueOnce(error);

    await expect(deletePolicy("5")).rejects.toBe(error);
  });

  it("creates a policy under an existing policy category", async () => {
    const policy = { id: 5, ...policyInput };
    policyModel.getCategoryById.mockResolvedValueOnce({
      id: policyInput.category_id,
      type: "policy",
    });
    policyModel.insertPolicy.mockResolvedValueOnce(policy);

    await expect(createPolicy(policyInput)).resolves.toBe(policy);
    expect(policyModel.getCategoryById).toHaveBeenCalledWith(11);
    expect(policyModel.insertPolicy).toHaveBeenCalledWith(policyInput);
  });

  it("rejects a category that does not exist", async () => {
    policyModel.getCategoryById.mockResolvedValueOnce(undefined);

    await expect(createPolicy(policyInput)).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
    expect(policyModel.insertPolicy).not.toHaveBeenCalled();
  });

  it("rejects a service category", async () => {
    policyModel.getCategoryById.mockResolvedValueOnce({
      id: policyInput.category_id,
      type: "service",
    });

    await expect(createPolicy(policyInput)).rejects.toMatchObject({
      message: "Category must be a policy category",
      statusCode: 400,
    });
    expect(policyModel.insertPolicy).not.toHaveBeenCalled();
  });

  it("maps a category foreign-key violation to not found", async () => {
    policyModel.getCategoryById.mockResolvedValueOnce({
      id: policyInput.category_id,
      type: "policy",
    });
    policyModel.insertPolicy.mockRejectedValueOnce({ code: "23503" });

    await expect(createPolicy(policyInput)).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
  });

  it("handles a category type change before insertion", async () => {
    policyModel.getCategoryById
      .mockResolvedValueOnce({ id: 11, type: "policy" })
      .mockResolvedValueOnce({ id: 11, type: "service" });
    policyModel.insertPolicy.mockResolvedValueOnce(undefined);

    await expect(createPolicy(policyInput)).rejects.toMatchObject({
      message: "Category must be a policy category",
      statusCode: 400,
    });
  });

  it("rethrows unexpected database errors", async () => {
    const error = new Error("Database unavailable");
    policyModel.getCategoryById.mockRejectedValueOnce(error);

    await expect(createPolicy(policyInput)).rejects.toBe(error);
  });

  it("passes partial policy updates to the model", async () => {
    const changes = { title: "Updated Handbook" };
    const policy = { id: 5, ...policyInput, ...changes };
    policyModel.updatePolicy.mockResolvedValueOnce(policy);

    await expect(updatePolicy("5", changes)).resolves.toBe(policy);
    expect(policyModel.getCategoryById).not.toHaveBeenCalled();
    expect(policyModel.updatePolicy).toHaveBeenCalledWith("5", changes);
  });

  it("requires a changed category to be an existing policy category", async () => {
    policyModel.getCategoryById.mockResolvedValueOnce(undefined);
    await expect(
      updatePolicy("5", { category_id: 12 }),
    ).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
    expect(policyModel.updatePolicy).not.toHaveBeenCalled();

    policyModel.getCategoryById.mockResolvedValueOnce({
      id: 10,
      type: "service",
    });
    await expect(
      updatePolicy("5", { category_id: 10 }),
    ).rejects.toMatchObject({
      message: "Category must be a policy category",
      statusCode: 400,
    });
    expect(policyModel.updatePolicy).not.toHaveBeenCalled();
  });

  it("returns not found for missing policies and detects category type races", async () => {
    policyModel.updatePolicy.mockResolvedValueOnce(undefined);
    await expect(
      updatePolicy("99", { title: "Updated" }),
    ).rejects.toMatchObject({
      message: "Policy not found",
      statusCode: 404,
    });

    policyModel.getCategoryById
      .mockResolvedValueOnce({ id: 11, type: "policy" })
      .mockResolvedValueOnce({ id: 11, type: "service" });
    policyModel.updatePolicy.mockResolvedValueOnce(undefined);
    await expect(
      updatePolicy("5", { category_id: 11 }),
    ).rejects.toMatchObject({
      message: "Category must be a policy category",
      statusCode: 400,
    });
  });

  it("maps category foreign-key races and rethrows unexpected update errors", async () => {
    policyModel.getCategoryById.mockResolvedValueOnce({
      id: 11,
      type: "policy",
    });
    policyModel.updatePolicy.mockRejectedValueOnce({ code: "23503" });
    await expect(
      updatePolicy("5", { category_id: 11 }),
    ).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });

    const error = new Error("Database unavailable");
    policyModel.updatePolicy.mockRejectedValueOnce(error);
    await expect(updatePolicy("5", { title: "Updated" })).rejects.toBe(error);
  });
});
