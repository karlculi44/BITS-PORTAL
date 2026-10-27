import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, categoryModel] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/categoryModel.js"),
]);

let client;

describe("category model integration", () => {
  beforeAll(async () => {
    await verifyTestDatabase();
    client = await modelPool.connect();
    await client.query(
      `CREATE TEMPORARY TABLE categories (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name character varying NOT NULL UNIQUE,
        description text NOT NULL,
        type character varying NOT NULL,
        is_active boolean DEFAULT true NOT NULL
      )`,
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

  it("finds every literal substring match while exact lookup stays exact", async () => {
    const key = randomUUID();
    const names = [
      `First ${key}%_Book service`,
      `Second ${key}%_Book policy`,
      `Other ${key}XXBook`,
    ];

    for (const name of names) {
      await categoryModel.insertCategory(name, "Integration test", "service");
    }

    const matches = await categoryModel.searchCategoriesByName(`${key}%_Book`);
    expect(matches.map((category) => category.name).sort()).toEqual(
      names.slice(0, 2).sort(),
    );
    expect(await categoryModel.searchCategoriesByName(`${key}-missing`)).toEqual(
      [],
    );
    expect(await categoryModel.getCategoryByName(`${key}%_Book`)).toBeUndefined();
    expect(await categoryModel.getCategoryByName(names[0])).toMatchObject({
      name: names[0],
    });
  });

  it("updates only supplied fields and enforces unique names", async () => {
    const first = await categoryModel.insertCategory(
      `First ${randomUUID()}`,
      "Original description",
      "service",
    );
    const second = await categoryModel.insertCategory(
      `Second ${randomUUID()}`,
      "Other description",
      "policy",
    );

    const updated = await categoryModel.updateCategory({
      categoryId: first.id,
      description: "Updated description",
      isActive: false,
    });

    expect(updated).toEqual({
      id: first.id,
      name: first.name,
      description: "Updated description",
      type: "service",
      is_active: false,
    });
    expect(await categoryModel.getCategoryByName(first.name)).toEqual(updated);
    const renamed = await categoryModel.updateCategory({
      categoryId: first.id,
      name: `${first.name} renamed`,
      type: "policy",
    });
    expect(renamed).toEqual({
      ...updated,
      name: `${first.name} renamed`,
      type: "policy",
    });
    expect(await categoryModel.getCategoryByName(renamed.name)).toEqual(renamed);
    await expect(
      categoryModel.updateCategory({ categoryId: first.id, name: renamed.name }),
    ).resolves.toEqual(renamed);
    await expect(
      categoryModel.updateCategory({ categoryId: first.id, name: second.name }),
    ).rejects.toMatchObject({ code: "23505" });
    expect(
      await categoryModel.updateCategory({
        categoryId: 2147483647,
        type: "policy",
      }),
    ).toBeUndefined();
  });

  it("deletes a category and returns the deleted record", async () => {
    const category = await categoryModel.insertCategory(
      `Delete ${randomUUID()}`,
      "To delete",
      "service",
    );

    await expect(categoryModel.deleteCategory(category.id)).resolves.toEqual(
      category,
    );
    await expect(categoryModel.deleteCategory(category.id)).resolves.toBeUndefined();
  });
});
