import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, officeServiceModel] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/officeServiceModel.js"),
]);

let client;

describe("officeServiceModel integration", () => {
  beforeAll(async () => {
    await verifyTestDatabase();
    client = await modelPool.connect();
    await client.query(
      `CREATE TEMPORARY TABLE categories (
        id integer PRIMARY KEY,
        type character varying NOT NULL
      )`,
    );
    await client.query(
      `CREATE TEMPORARY TABLE services (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title character varying(255) NOT NULL,
        url text NOT NULL,
        image text,
        description text NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        category_id integer NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    );
    await client.query(
      "INSERT INTO categories (id, type) VALUES (10, 'service'), (11, 'policy')",
    );
    vi.spyOn(modelPool, "query").mockImplementation((...args) =>
      client.query(...args),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (client) {
      client.release();
    }
    await modelPool.end();
    await testPool.end();
  });

  it("inserts a service with database defaults when optional fields are omitted", async () => {
    const category = await officeServiceModel.getCategoryById(10);
    expect(category).toEqual({ id: 10, type: "service" });

    const service = await officeServiceModel.insertService({
      title: "Transcript Request",
      url: "https://example.com/transcript",
      description: "Request an official transcript",
      category_id: 10,
    });

    expect(service).toMatchObject({
      title: "Transcript Request",
      url: "https://example.com/transcript",
      image: null,
      description: "Request an official transcript",
      sort_order: 0,
      category_id: 10,
    });
    expect(service.created_at).toBeInstanceOf(Date);
    expect(service.updated_at).toBeInstanceOf(Date);
  });

  it("inserts explicitly supplied image and sort order", async () => {
    const service = await officeServiceModel.insertService({
      title: "Enrollment",
      url: "https://example.com/enrollment",
      description: "Apply for enrollment",
      image: "https://example.com/enrollment.png",
      sort_order: 5,
      category_id: 10,
    });

    expect(service).toMatchObject({
      image: "https://example.com/enrollment.png",
      description: "Apply for enrollment",
      sort_order: 5,
      category_id: 10,
    });
  });

  it("does not insert for categories that are missing or not service categories", async () => {
    const input = {
      title: "Not inserted",
      url: "https://example.com/not-inserted",
      description: "Not inserted",
      category_id: 11,
    };

    await expect(officeServiceModel.insertService(input)).resolves.toBeUndefined();
    await expect(
      officeServiceModel.insertService({ ...input, category_id: 99 }),
    ).resolves.toBeUndefined();
  });

  it("updates only supplied fields and preserves the remaining service data", async () => {
    const created = await officeServiceModel.insertService({
      title: "Original title",
      url: "https://example.com/original",
      description: "Original description",
      image: "https://example.com/original.png",
      sort_order: 2,
      category_id: 10,
    });

    const updated = await officeServiceModel.updateService(created.id, {
      title: "Updated title",
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: "Updated title",
      url: created.url,
      description: created.description,
      image: created.image,
      sort_order: created.sort_order,
      category_id: created.category_id,
    });
  });

  it("searches literal substrings in both title and description", async () => {
    const term = "SearchTerm";
    const titleMatch = await officeServiceModel.insertService({
      title: `${term} service`,
      url: "https://example.com/search-title",
      description: "A title match",
      category_id: 10,
    });
    const descriptionMatch = await officeServiceModel.insertService({
      title: "A description match",
      url: "https://example.com/search-description",
      description: `Details about ${term}`,
      category_id: 10,
    });
    await officeServiceModel.insertService({
      title: "Not matching",
      url: "https://example.com/search-none",
      description: "Still not matching",
      category_id: 10,
    });

    const matches = await officeServiceModel.searchServices(term);
    expect(matches.map((service) => service.id).sort()).toEqual(
      [titleMatch.id, descriptionMatch.id].sort(),
    );
    expect(await officeServiceModel.searchServices("MissingTerm")).toEqual([]);
    expect(await officeServiceModel.searchServices("searchterm")).toEqual([]);
  });

  it("only updates the category to an existing service category", async () => {
    const created = await officeServiceModel.insertService({
      title: "Category update",
      url: "https://example.com/category-update",
      description: "Category update test",
      category_id: 10,
    });

    const updated = await officeServiceModel.updateService(created.id, {
      category_id: 10,
    });
    expect(updated.category_id).toBe(10);

    await expect(
      officeServiceModel.updateService(created.id, { category_id: 11 }),
    ).resolves.toBeUndefined();
    await expect(
      officeServiceModel.updateService(created.id, { category_id: 99 }),
    ).resolves.toBeUndefined();
  });
});
