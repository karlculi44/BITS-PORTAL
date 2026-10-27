import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/policyModel.js", () => ({
  getCategoryById: vi.fn(),
  insertPolicy: vi.fn(),
}));

import * as policyModel from "../../src/models/policyModel.js";
import { createPolicy } from "../../src/services/policyService.js";

const policyInput = {
  title: "Student Handbook",
  description: "Guidelines for students",
  file: "https://example.com/handbook.pdf",
  category_id: 11,
};

describe("policyService", () => {
  beforeEach(() => {
    policyModel.getCategoryById.mockReset();
    policyModel.insertPolicy.mockReset();
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
});
