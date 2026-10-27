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

describe("category name lookup integration", () => {
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
});
