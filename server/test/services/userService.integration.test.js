import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, userModel, userService] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/userModel.js"),
  import("../../src/services/userService.js"),
]);

const createdUserIds = new Set();

const createUser = async (overrides = {}) => {
  const user = await userService.createUser({
    firstName: "Service",
    lastName: "Integration",
    username: `service_${randomUUID()}`,
    password: "initial-password",
    role: "staff",
    ...overrides,
  });

  createdUserIds.add(user.id);
  return user;
};

describe("userService integration", () => {
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

  it("creates users with a hashed password and returns safe user data", async () => {
    const created = await createUser();
    const stored = await userModel.getUserForLogin(created.username);

    expect(created).not.toHaveProperty("password_hash");
    expect(stored.password_hash).not.toBe("initial-password");
    expect(await bcrypt.compare("initial-password", stored.password_hash)).toBe(
      true,
    );
  });

  it("updates only supplied fields and hashes a changed password", async () => {
    const created = await createUser({
      firstName: "Before",
      lastName: "Unchanged",
    });

    const updated = await userService.updateUser({
      userId: created.id,
      firstName: "After",
      password: "updated-password",
    });
    const stored = await userModel.getUserForLogin(created.username);

    expect(updated).toMatchObject({
      id: created.id,
      first_name: "After",
      last_name: "Unchanged",
      username: created.username,
    });
    expect(updated).not.toHaveProperty("password_hash");
    expect(stored.password_hash).not.toBe("updated-password");
    expect(await bcrypt.compare("updated-password", stored.password_hash)).toBe(
      true,
    );
  });

  it("maps a duplicate username constraint to a conflict error", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();

    await expect(
      userService.updateUser({
        userId: secondUser.id,
        username: firstUser.username,
      }),
    ).rejects.toMatchObject({
      message: "Username unavailable",
      statusCode: 409,
    });
  });
});
