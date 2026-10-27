import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, policyModel] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/policyModel.js"),
]);

let client;

describe("policyModel integration", () => {
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
      `CREATE TEMPORARY TABLE policies (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        category_id integer NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        title character varying(255) NOT NULL,
        description text,
        file text NOT NULL,
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

  it("inserts a policy and uses null when the description is omitted", async () => {
    expect(await policyModel.getCategoryById(11)).toEqual({
      id: 11,
      type: "policy",
    });
    const policy = await policyModel.insertPolicy({
      title: "Student Handbook",
      file: "https://example.com/handbook.pdf",
      category_id: 11,
    });

    expect(policy).toMatchObject({
      title: "Student Handbook",
      description: null,
      file: "https://example.com/handbook.pdf",
      category_id: 11,
    });
    expect(policy.created_at).toBeInstanceOf(Date);
    expect(policy.updated_at).toBeInstanceOf(Date);
  });

  it("inserts a policy with an explicitly provided description", async () => {
    const policy = await policyModel.insertPolicy({
      title: "Academic Policy",
      description: "Academic guidelines",
      file: "https://example.com/academic-policy.pdf",
      category_id: 11,
    });

    expect(policy.description).toBe("Academic guidelines");
  });

  it("does not insert for missing or non-policy categories", async () => {
    const input = {
      title: "Not inserted",
      file: "https://example.com/not-inserted.pdf",
      category_id: 10,
    };

    await expect(policyModel.insertPolicy(input)).resolves.toBeUndefined();
    await expect(
      policyModel.insertPolicy({ ...input, category_id: 99 }),
    ).resolves.toBeUndefined();
  });

  it("updates only supplied fields and preserves the remaining policy fields", async () => {
    const created = await policyModel.insertPolicy({
      title: "Original Handbook",
      description: "Original guidelines",
      file: "https://example.com/original-handbook.pdf",
      category_id: 11,
    });

    const updated = await policyModel.updatePolicy(created.id, {
      title: "Updated Handbook",
    });

    expect(updated).toMatchObject({
      id: created.id,
      category_id: created.category_id,
      title: "Updated Handbook",
      description: created.description,
      file: created.file,
    });
  });

  it("allows nullable description updates and only accepts policy categories", async () => {
    const created = await policyModel.insertPolicy({
      title: "Category Update Policy",
      file: "https://example.com/category-update-policy.pdf",
      category_id: 11,
    });

    const cleared = await policyModel.updatePolicy(created.id, {
      description: null,
    });
    expect(cleared.description).toBeNull();

    const moved = await policyModel.updatePolicy(created.id, {
      category_id: 11,
    });
    expect(moved.category_id).toBe(11);

    await expect(
      policyModel.updatePolicy(created.id, { category_id: 10 }),
    ).resolves.toBeUndefined();
    await expect(
      policyModel.updatePolicy(created.id, { category_id: 99 }),
    ).resolves.toBeUndefined();
  });
});
