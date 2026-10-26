import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import request from "supertest";
import {
  testDatabaseConnectionString,
  testPool,
  verifyTestDatabase,
} from "../helpers/testDatabase.js";
import { hashToken } from "../../src/utils/hashToken.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: modelPool }, { default: app }, userModel, userService] =
  await Promise.all([
    import("../../src/config/db.js"),
    import("../../src/app.js"),
    import("../../src/models/userModel.js"),
    import("../../src/services/userService.js"),
  ]);

const accessSecret = "integration-route-access-secret";
const refreshSecret = "integration-route-refresh-secret";
const createdUserIds = new Set();

const createUser = async (overrides = {}) => {
  const user = await userService.createUser({
    firstName: "Route",
    lastName: "Integration",
    username: `route_${randomUUID()}`,
    password: "initial-password",
    role: "staff",
    ...overrides,
  });

  createdUserIds.add(user.id);
  return user;
};

const accessCookie = (userId, role = "admin") => {
  const token = jwt.sign({ role }, accessSecret, {
    subject: String(userId),
  });

  return `accessToken=${token}`;
};

describe("routes integration", () => {
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

  it("creates a user and permits the created user to log in", async () => {
    const admin = await createUser({ role: "admin" });
    const username = `route_${randomUUID()}`;
    const password = "created-user-password";

    const creationResponse = await request(app)
      .post("/api/users")
      .set("Cookie", accessCookie(admin.id))
      .send({
        firstName: "Created",
        lastName: "User",
        username,
        password,
        role: "staff",
      });

    expect(creationResponse.status).toBe(201);
    expect(creationResponse.body.data).toMatchObject({
      first_name: "Created",
      last_name: "User",
      username,
      role: "staff",
    });
    expect(creationResponse.body.data).not.toHaveProperty("password_hash");
    createdUserIds.add(creationResponse.body.data.id);

    const storedUser = await userModel.getUserForLogin(username);
    expect(storedUser.password_hash).not.toBe(password);
    expect(await bcrypt.compare(password, storedUser.password_hash)).toBe(true);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ username, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      message: "Login successful",
      data: {
        id: creationResponse.body.data.id,
        username,
      },
    });
    expect(loginResponse.body.data).not.toHaveProperty("password_hash");
    expect(loginResponse.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken="),
        expect.stringContaining("refreshToken="),
      ]),
    );

    const refreshToken = loginResponse.headers["set-cookie"]
      .find((cookie) => cookie.startsWith("refreshToken="))
      .split(";")[0]
      .slice("refreshToken=".length);
    const tokenRows = await testPool.query(
      "SELECT token_hash FROM refresh_tokens WHERE user_id = $1",
      [creationResponse.body.data.id],
    );

    expect(tokenRows.rows).toEqual([
      { token_hash: hashToken(decodeURIComponent(refreshToken)) },
    ]);
  });

  it("persists only fields supplied to the PATCH route", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser({
      firstName: "Original",
      lastName: "Keep",
    });
    const oldUpdatedAt = new Date("2000-01-01T00:00:00.000Z");
    await testPool.query(
      "UPDATE users SET updated_at = $1 WHERE id = $2",
      [oldUpdatedAt, user.id],
    );

    const response = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Cookie", accessCookie(admin.id))
      .send({ firstName: "Changed" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: user.id,
      first_name: "Changed",
      last_name: "Keep",
      username: user.username,
      role: "staff",
      is_active: true,
    });
    expect(response.body.data).not.toHaveProperty("password_hash");

    const persistedUser = await testPool.query(
      `SELECT first_name, last_name, username, updated_at
       FROM users
       WHERE id = $1`,
      [user.id],
    );

    expect(persistedUser.rows[0]).toMatchObject({
      first_name: "Changed",
      last_name: "Keep",
      username: user.username,
    });
    expect(new Date(persistedUser.rows[0].updated_at).getTime()).toBeGreaterThan(
      oldUpdatedAt.getTime(),
    );
  });
});
