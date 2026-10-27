import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/officeServiceModel.js", () => ({
  getAllServices: vi.fn(),
  getCategoryById: vi.fn(),
  insertService: vi.fn(),
  searchServices: vi.fn(),
  updateService: vi.fn(),
}));

import * as officeServiceModel from "../../src/models/officeServiceModel.js";
import {
  createService,
  getAllServices,
  searchServices,
  updateService,
} from "../../src/services/officeOfferingService.js";

const serviceInput = {
  title: "Transcript Request",
  url: "https://example.com/transcript",
  description: "Request an official transcript",
  image: null,
  category_id: 3,
};

describe("officeOfferingService", () => {
  beforeEach(() => {
    officeServiceModel.getAllServices.mockReset();
    officeServiceModel.getCategoryById.mockReset();
    officeServiceModel.insertService.mockReset();
    officeServiceModel.searchServices.mockReset();
    officeServiceModel.updateService.mockReset();
  });

  it("returns all services from the model", async () => {
    const services = [{ id: 8, title: "Transcript Request" }];
    officeServiceModel.getAllServices.mockResolvedValueOnce(services);

    await expect(getAllServices()).resolves.toBe(services);
    expect(officeServiceModel.getAllServices).toHaveBeenCalledOnce();
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

  it("returns matching services from the model", async () => {
    const services = [{ id: 8, title: "Transcript Request" }];
    officeServiceModel.searchServices.mockResolvedValueOnce(services);

    await expect(searchServices("transcript")).resolves.toBe(services);
    expect(officeServiceModel.searchServices).toHaveBeenCalledWith(
      "transcript",
    );
  });

  it("updates a service without requiring category validation when category is unchanged", async () => {
    const changes = { title: "Updated transcript request" };
    const service = { id: 8, ...serviceInput, ...changes };
    officeServiceModel.updateService.mockResolvedValueOnce(service);

    await expect(updateService(8, changes)).resolves.toBe(service);
    expect(officeServiceModel.getCategoryById).not.toHaveBeenCalled();
    expect(officeServiceModel.updateService).toHaveBeenCalledWith(8, changes);
  });

  it("requires a new category to exist and be a service category", async () => {
    officeServiceModel.getCategoryById.mockResolvedValueOnce(undefined);

    await expect(updateService(8, { category_id: 9 })).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });
    expect(officeServiceModel.updateService).not.toHaveBeenCalled();

    officeServiceModel.getCategoryById.mockResolvedValueOnce({
      id: 9,
      type: "policy",
    });
    await expect(updateService(8, { category_id: 9 })).rejects.toMatchObject({
      message: "Category must be a service category",
      statusCode: 400,
    });
    expect(officeServiceModel.updateService).not.toHaveBeenCalled();
  });

  it("reports missing services and category changes that race with an update", async () => {
    officeServiceModel.updateService.mockResolvedValueOnce(undefined);
    await expect(updateService(99, { title: "Updated" })).rejects.toMatchObject({
      message: "Service not found",
      statusCode: 404,
    });

    officeServiceModel.getCategoryById
      .mockResolvedValueOnce({ id: 9, type: "service" })
      .mockResolvedValueOnce({ id: 9, type: "policy" });
    officeServiceModel.updateService.mockResolvedValueOnce(undefined);
    await expect(
      updateService(8, { category_id: 9 }),
    ).rejects.toMatchObject({
      message: "Category must be a service category",
      statusCode: 400,
    });
  });

  it("maps category foreign-key races and rethrows unexpected update errors", async () => {
    officeServiceModel.getCategoryById.mockResolvedValueOnce({
      id: 9,
      type: "service",
    });
    officeServiceModel.updateService.mockRejectedValueOnce({ code: "23503" });
    await expect(
      updateService(8, { category_id: 9 }),
    ).rejects.toMatchObject({
      message: "Category not found",
      statusCode: 404,
    });

    const error = new Error("Database unavailable");
    officeServiceModel.updateService.mockRejectedValueOnce(error);
    await expect(updateService(8, { title: "Updated" })).rejects.toBe(error);
  });
});
