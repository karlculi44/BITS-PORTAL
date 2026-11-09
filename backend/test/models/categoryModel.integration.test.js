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
        name character varying NOT NULL,
        type character varying NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        is_default boolean DEFAULT false NOT NULL,
        UNIQUE (name, type)
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
    expect(await categoryModel.getCategoryByName(`${key}%_Book`, "service"))
      .toBeUndefined();
    expect(
      await categoryModel.getCategoryByName(names[0], "service"),
    ).toMatchObject({ name: names[0], type: "service" });
  });

  it("allows same names across types and enforces uniqueness within a type", async () => {
    const first = await categoryModel.insertCategory(
      `Shared ${randomUUID()}`,
      "service",
    );
    const policy = await categoryModel.insertCategory(
      `Shared ${first.name.slice("Shared ".length)}`,
      "policy",
    );
    const anotherService = await categoryModel.insertCategory(
      `Other ${randomUUID()}`,
      "service",
    );

    expect(policy.name).toBe(first.name);
    expect(
      await categoryModel.getCategoryByName(first.name, "service"),
    ).toMatchObject({ id: first.id, type: "service" });
    expect(
      await categoryModel.getCategoryByName(first.name, "service", first.id),
    ).toBeUndefined();
    expect(
      await categoryModel.getCategoryByName(first.name, "policy"),
    ).toMatchObject({ id: policy.id, type: "policy" });

    await expect(
      categoryModel.insertCategory(first.name, "service"),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      categoryModel.insertCategory(first.name, "policy"),
    ).rejects.toMatchObject({ code: "23505" });

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
    expect(
      await categoryModel.getCategoryByName(updated.name, "service"),
    ).toEqual(updated);
    await expect(
      categoryModel.updateCategory({
        categoryId: first.id,
        name: anotherService.name,
      }),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      categoryModel.updateCategory({ categoryId: first.id, name: policy.name }),
    ).resolves.toMatchObject({
      id: first.id,
      name: policy.name,
      type: "service",
    });
    expect(
      await categoryModel.updateCategory({
        categoryId: 2147483647,
        name: "Missing",
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
