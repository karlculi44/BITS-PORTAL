import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, userModel] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/userModel.js"),
]);

const createdUserIds = new Set();

const createUser = async (overrides = {}) => {
  const user = await userModel.insertUser({
    firstName: "Model",
    lastName: "Integration",
    username: `model_${randomUUID()}`,
    passwordHash: "test-password-hash",
    role: "staff",
    ...overrides,
  });

  createdUserIds.add(user.id);
  return user;
};

describe("userModel integration", () => {
  beforeAll(verifyTestDatabase);

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await testPool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    createdUserIds.clear();
  });

  afterAll(async () => {
    await modelPool.end();
    await testPool.end();
  });

  it("inserts and finds a user without returning the password hash", async () => {
    const username = `model_${randomUUID()}`;
    const created = await createUser({
      username,
      firstName: "O'Neil",
    });

    const found = await userModel.getUserByUsername(username);

    expect(created).toMatchObject({
      first_name: "O'Neil",
      last_name: "Integration",
      username,
      role: "staff",
      is_active: true,
    });
    expect(found).toMatchObject({
      id: created.id,
      first_name: "O'Neil",
      username,
    });
    expect(found).not.toHaveProperty("password_hash");
  });

  it("updates only supplied fields and advances updated_at", async () => {
    const created = await createUser({
      firstName: "Original",
      lastName: "Name",
      username: `model_${randomUUID()}`,
    });
    const oldUpdatedAt = new Date("2000-01-01T00:00:00.000Z");
    await testPool.query(
      "UPDATE users SET updated_at = $1 WHERE id = $2",
      [oldUpdatedAt, created.id],
    );

    const updated = await userModel.updateUser({
      userId: created.id,
      firstName: "Changed",
    });

    expect(updated).toMatchObject({
      id: created.id,
      first_name: "Changed",
      last_name: "Name",
      username: created.username,
      role: "staff",
      is_active: true,
    });
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
      oldUpdatedAt.getTime(),
    );
    expect(updated).not.toHaveProperty("password_hash");
  });

  it("enforces unique usernames", async () => {
    const username = `model_${randomUUID()}`;
    await createUser({ username });

    await expect(createUser({ username })).rejects.toMatchObject({
      code: "23505",
    });
  });
});
