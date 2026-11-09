import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, authModel, userModel] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/models/authModel.js"),
  import("../../src/models/userModel.js"),
]);

const createdUserIds = new Set();

const createUser = async () => {
  const user = await userModel.insertUser({
    firstName: "Auth",
    lastName: "Integration",
    username: `auth_${randomUUID()}`,
    passwordHash: "test-password-hash",
    role: "staff",
  });

  createdUserIds.add(user.id);
  return user;
};

describe("authModel integration", () => {
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

  it("stores refresh-token hashes with their user and expiry", async () => {
    const user = await createUser();
    const tokenHash = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await authModel.insertRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const result = await testPool.query(
      `SELECT user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );

    expect(result.rows[0]).toMatchObject({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked_at: null,
    });
  });

  it("atomically consumes a refresh token and stores its replacement", async () => {
    const user = await createUser();
    const oldTokenHash = randomUUID();
    const nextTokenHash = randomUUID();

    await authModel.insertRefreshToken({
      userId: user.id,
      tokenHash: oldTokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const rotated = await authModel.rotateRefreshToken({
      tokenHash: oldTokenHash,
      userId: user.id,
      nextTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(rotated).toBe(true);
    const result = await testPool.query(
      `SELECT token_hash, revoked_at
       FROM refresh_tokens
       WHERE user_id = $1 AND token_hash = ANY($2)`,
      [user.id, [oldTokenHash, nextTokenHash]],
    );
    expect(result.rows).toHaveLength(2);
    expect(
      result.rows.find((row) => row.token_hash === oldTokenHash).revoked_at,
    ).toBeTruthy();
    expect(
      result.rows.find((row) => row.token_hash === nextTokenHash).revoked_at,
    ).toBeNull();

    await expect(
      authModel.rotateRefreshToken({
        tokenHash: oldTokenHash,
        userId: user.id,
        nextTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    ).resolves.toBe(false);
  });

  it("removes refresh tokens when their user is deleted", async () => {
    const user = await createUser();
    const tokenHash = randomUUID();

    await authModel.insertRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await testPool.query("DELETE FROM users WHERE id = $1", [user.id]);
    createdUserIds.delete(user.id);

    const result = await testPool.query(
      "SELECT id FROM refresh_tokens WHERE token_hash = $1",
      [tokenHash],
    );

    expect(result.rows).toHaveLength(0);
  });
});
