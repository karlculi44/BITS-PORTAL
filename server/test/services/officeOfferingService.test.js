import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/officeServiceModel.js", () => ({
  getCategoryById: vi.fn(),
  insertService: vi.fn(),
}));

import * as officeServiceModel from "../../src/models/officeServiceModel.js";
import { createService } from "../../src/services/officeOfferingService.js";

const serviceInput = {
  title: "Transcript Request",
  url: "https://example.com/transcript",
  description: "Request an official transcript",
  image: null,
  category_id: 3,
};

describe("officeOfferingService", () => {
  beforeEach(() => {
    officeServiceModel.getCategoryById.mockReset();
    officeServiceModel.insertService.mockReset();
  });

  it("creates a service under an existing service category", async () => {
    const service = { id: 8, ...serviceInput, sort_order: 0 };
    officeServiceModel.getCategoryById.mockResolvedValueOnce({
      id: serviceInput.category_id,
      type: "service",
    });
    officeServiceModel.insertService.mockResolvedValueOnce(service);

    await expect(createService(serviceInput)).resolves.toBe(service);
    expect(officeServiceModel.getCategoryById).toHaveBeenCalledWith(3);
    expect(officeServiceModel.insertService).toHaveBeenCalledWith(serviceInput);
  });

  it("rejects a category that does not exist", async () => {
    officeServiceModel.getCategoryById.mockResolvedValueOnce(undefined);

    await expect(createService(serviceInput)).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
    expect(officeServiceModel.insertService).not.toHaveBeenCalled();
  });

  it("rejects a policy category", async () => {
    officeServiceModel.getCategoryById.mockResolvedValueOnce({
      id: serviceInput.category_id,
      type: "policy",
    });

    await expect(createService(serviceInput)).rejects.toMatchObject({
      message: "Category must be a service category",
      statusCode: 400,
    });
    expect(officeServiceModel.insertService).not.toHaveBeenCalled();
  });

  it("maps a category foreign-key violation to not found", async () => {
    officeServiceModel.getCategoryById.mockResolvedValueOnce({
      id: serviceInput.category_id,
      type: "service",
    });
    officeServiceModel.insertService.mockRejectedValueOnce({ code: "23503" });

    await expect(createService(serviceInput)).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
  });

  it("reports a category type change that occurs before insertion", async () => {
    officeServiceModel.getCategoryById
      .mockResolvedValueOnce({ id: 3, type: "service" })
      .mockResolvedValueOnce({ id: 3, type: "policy" });
    officeServiceModel.insertService.mockResolvedValueOnce(undefined);

    await expect(createService(serviceInput)).rejects.toMatchObject({
      message: "Category must be a service category",
      statusCode: 400,
    });
  });

  it("rethrows unexpected database errors", async () => {
    const error = new Error("Database unavailable");
    officeServiceModel.getCategoryById.mockRejectedValueOnce(error);

    await expect(createService(serviceInput)).rejects.toBe(error);
  });
});
