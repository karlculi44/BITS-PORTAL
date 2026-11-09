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
        type character varying NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        is_default boolean DEFAULT false NOT NULL
      )`,
    );
    await client.query(
      `CREATE UNIQUE INDEX idx_categories_one_default_per_type
        ON categories (type) WHERE is_default = true`,
    );
    vi.spyOn(modelPool, "query").mockImplementation((...args) =>
      client.query(...args),
    );
    vi.spyOn(modelPool, "connect").mockResolvedValue({
      query: (...args) => client.query(...args),
      release: () => {},
    });
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
      await categoryModel.insertCategory(name, "service");
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
      "service",
    );
    const second = await categoryModel.insertCategory(
      `Second ${randomUUID()}`,
      "policy",
    );

    const updated = await categoryModel.updateCategory({
      categoryId: first.id,
      name: `Updated ${first.name}`,
      isActive: false,
    });

    expect(updated).toEqual({
      id: first.id,
      name: `Updated ${first.name}`,
      type: "service",
      is_active: false,
      is_default: false,
    });
    expect(await categoryModel.getCategoryByName(updated.name)).toEqual(updated);
    const renamed = await categoryModel.updateCategory({
      categoryId: first.id,
      name: `${updated.name} renamed`,
      type: "policy",
    });
    expect(renamed).toEqual({
      ...updated,
      name: `${updated.name} renamed`,
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
      "service",
    );

    await expect(categoryModel.deleteCategory(category.id)).resolves.toEqual(
      category,
    );
    await expect(categoryModel.deleteCategory(category.id)).resolves.toBeUndefined();
  });

  it("keeps one default service category and rejects policy defaults", async () => {
    const key = randomUUID();
    const serviceA = await categoryModel.insertCategory(`A ${key}`, "service");
    const serviceB = await categoryModel.insertCategory(`B ${key}`, "service");
    const policy = await categoryModel.insertCategory(`P ${key}`, "policy");

    await expect(
      categoryModel.setDefaultCategory(policy.id, true),
    ).rejects.toMatchObject({ code: "NOT_SERVICE_CATEGORY" });
    await categoryModel.setDefaultCategory(serviceA.id, true);
    const newDefault = await categoryModel.setDefaultCategory(serviceB.id, true);

    expect(newDefault.is_default).toBe(true);
    const services = await categoryModel.getAllCategories("service");
    expect(services.every((category) => category.type === "service")).toBe(true);
    expect(services.filter((category) => category.is_default)).toEqual([
      newDefault,
    ]);
    const unset = await categoryModel.setDefaultCategory(serviceB.id, false);
    expect(unset.is_default).toBe(false);
    expect(
      (await categoryModel.getAllCategories("service")).some(
        (category) => category.is_default,
      ),
    ).toBe(false);
    expect(
      (await categoryModel.getAllCategories("policy")).find(
        (category) => category.id === policy.id,
      ).is_default,
    ).toBe(false);
    expect(
      await categoryModel.setDefaultCategory(2147483647, true),
    ).toBeUndefined();
  });
});
