import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";
import { hashToken } from "../../src/utils/hashToken.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, userService, authService] = await Promise.all([
  import("../../src/config/db.js"),
  import("../../src/services/userService.js"),
  import("../../src/services/authService.js"),
]);

const createdUserIds = new Set();
const accessSecret = "integration-test-access-secret";
const refreshSecret = "integration-test-refresh-secret";

const createUser = async () => {
  const username = `login_${randomUUID()}`;
  const user = await userService.createUser({
    firstName: "Login",
    lastName: "Integration",
    username,
    password: "valid-password",
    role: "staff",
  });

  createdUserIds.add(user.id);
  return user;
};

describe("authService integration", () => {
  beforeAll(async () => {
    await verifyTestDatabase();
    vi.stubEnv("JWT_ACCESS_SECRET", accessSecret);
    vi.stubEnv("JWT_REFRESH_SECRET", refreshSecret);
  });

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await testPool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    createdUserIds.clear();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await modelPool.end();
    await testPool.end();
  });

  it("logs in with a stored user and persists a hashed refresh token", async () => {
    const user = await createUser();

    const result = await authService.loginUser({
      username: user.username,
      password: "valid-password",
    });

    expect(result.user).toMatchObject({
      id: user.id,
      username: user.username,
      role: "staff",
    });
    expect(result.user).not.toHaveProperty("password_hash");
    expect(
      jwt.verify(result.accessToken, accessSecret, {
        subject: String(user.id),
      }),
    ).toMatchObject({ role: "staff" });
    const refreshClaims = jwt.verify(result.refreshToken, refreshSecret, {
      subject: String(user.id),
    });
    expect(refreshClaims.sub).toBe(String(user.id));
    expect(refreshClaims.exp - refreshClaims.iat).toBe(7 * 24 * 60 * 60);

    const storedToken = await testPool.query(
      "SELECT user_id, token_hash FROM refresh_tokens WHERE user_id = $1",
      [user.id],
    );
    expect(storedToken.rows).toHaveLength(1);
    expect(storedToken.rows[0]).toEqual({
      user_id: user.id,
      token_hash: hashToken(result.refreshToken),
    });
    expect(storedToken.rows[0].token_hash).not.toBe(result.refreshToken);
  });
});
