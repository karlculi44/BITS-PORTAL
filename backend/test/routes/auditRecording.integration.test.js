import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { testDatabaseConnectionString, testPool, verifyTestDatabase } from "../helpers/testDatabase.js";
import { removePolicyDocument } from "../../src/utils/policyDocument.js";

process.env.DATABASE_URL = testDatabaseConnectionString;

const [{ default: app }, { default: modelPool }, userService, auditModel] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/config/db.js"),
  import("../../src/services/userService.js"),
  import("../../src/models/auditLogModel.js"),
]);

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const username = `audit_${suffix}`;
const missingUsername = `missing_${suffix}`;
const name = `Audit ${suffix}`;
let actor;
let token;
let refreshCookie;
const categories = [];
const services = [];
const policies = [];
const users = [];

const auth = (req) => req.set("Authorization", `Bearer ${token}`);

beforeAll(async () => {
  await verifyTestDatabase();
  const defaults = await testPool.query("SELECT count(*)::int AS count FROM categories WHERE type = 'service' AND is_default");
  if (defaults.rows[0].count !== 0) throw new Error("Audit integration test requires no pre-existing default service category");
  vi.stubEnv("JWT_ACCESS_SECRET", "audit-integration-access");
  vi.stubEnv("JWT_REFRESH_SECRET", "audit-integration-refresh");
  actor = await userService.createUser({
    firstName: "Audit", lastName: "Test", username, password: "test-password-123", role: "admin",
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  for (const id of services) await testPool.query("DELETE FROM services WHERE id = $1", [id]);
  for (const id of policies) {
    const result = await testPool.query("DELETE FROM policies WHERE id = $1 RETURNING file", [id]);
    if (result.rows[0]) await removePolicyDocument(result.rows[0].file);
  }
  for (const id of categories) await testPool.query("DELETE FROM categories WHERE id = $1", [id]);
  for (const id of users) await testPool.query("DELETE FROM users WHERE id = $1", [id]);
  await testPool.query("DELETE FROM logs WHERE username = $1 OR username = $2", [username, missingUsername]);
  if (actor) await testPool.query("DELETE FROM users WHERE id = $1", [actor.id]);
  vi.unstubAllEnvs();
  await modelPool.end();
  await testPool.end();
});

describe("automatic audit recording", () => {
  it("records login, failed login and logout without recording refreshes or secrets", async () => {
    const failed = await request(app).post("/api/auth/login")
      .send({ username: missingUsername, password: "wrong-password-123" });
    expect(failed.status).toBe(401);
    const login = await request(app).post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.99")
      .send({ username, password: "test-password-123" });
    expect(login.status).toBe(200);
    token = login.body.accessToken;
    refreshCookie = login.headers["set-cookie"].find((cookie) => cookie.startsWith("refreshToken=")).split(";")[0];
    const refresh = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(refresh.status).toBe(200);
    refreshCookie = refresh.headers["set-cookie"].find((cookie) => cookie.startsWith("refreshToken=")).split(";")[0];
    const logs = await testPool.query(
      "SELECT username, action, details, host(ip_address) AS ip FROM logs WHERE username IN ($1, $2) ORDER BY id",
      [username, missingUsername],
    );
    expect(logs.rows.map((row) => row.action)).toEqual(["Login Failed", "Login"]);
    expect(logs.rows[0].details).toContain(missingUsername);
    expect(JSON.stringify(logs.rows)).not.toContain("password-123");
    expect(logs.rows[1].ip).not.toBe("203.0.113.99");
  });

  it("records categories, services, policies, and user changes with the authenticated actor", async () => {
    const createCategory = async (type, label) => {
      const response = await auth(request(app).post("/api/categories")).send({ name: `${name} ${label}`, type });
      expect(response.status).toBe(201);
      categories.push(response.body.id);
      return response.body.id;
    };
    const serviceCategory = await createCategory("service", "service");
    const secondServiceCategory = await createCategory("service", "second");
    const policyCategory = await createCategory("policy", "policy");
    const secondPolicyCategory = await createCategory("policy", "second");
    expect((await auth(request(app).patch(`/api/categories/${serviceCategory}`))
      .send({ name: `${name} renamed` })).status).toBe(200);
    expect((await auth(request(app).patch(`/api/categories/${serviceCategory}/default`))
      .send({ isDefault: true })).status).toBe(200);
    expect((await auth(request(app).patch(`/api/categories/${serviceCategory}/default`))
      .send({ isDefault: false })).status).toBe(200);
    expect((await auth(request(app).patch(`/api/categories/${policyCategory}`))
      .send({ name: `${name} policy renamed` })).status).toBe(200);

    const service = await auth(request(app).post("/api/services")).send({
      title: name, url: "https://example.com", description: "Test", category_id: serviceCategory,
      actorId: 999,
    });
    expect(service.status).toBe(201);
    services.push(service.body.data.id);
    expect((await auth(request(app).patch(`/api/services/${services[0]}`))
      .send({ category_id: secondServiceCategory })).status).toBe(200);
    expect((await auth(request(app).delete(`/api/services/${services[0]}`))).status).toBe(200);
    services.length = 0;

    const policy = await auth(request(app).post("/api/policies"))
      .field("title", name).field("category_id", String(policyCategory))
      .attach("document", Buffer.from("%PDF-1.7\nfirst"), { filename: "a.pdf", contentType: "application/pdf" });
    expect(policy.status).toBe(201);
    policies.push(policy.body.data.id);
    expect((await auth(request(app).patch(`/api/policies/${policies[0]}`))
      .field("category_id", String(secondPolicyCategory))
      .attach("document", Buffer.from("%PDF-1.7\nsecond"), { filename: "b.pdf", contentType: "application/pdf" })).status).toBe(200);
    expect((await auth(request(app).delete(`/api/policies/${policies[0]}`))).status).toBe(200);
    policies.length = 0;

    const createdUser = await auth(request(app).post("/api/users")).send({
      firstName: "Target", lastName: "User", username: `target_${suffix}`,
      password: "target-password-123", role: "staff",
    });
    expect(createdUser.status).toBe(201);
    users.push(createdUser.body.data.id);
    expect((await auth(request(app).patch(`/api/users/${users[0]}`))
      .send({ isActive: false, canAccessServices: true })).status).toBe(200);
    expect((await auth(request(app).patch(`/api/users/${users[0]}`))
      .send({ isActive: true, role: "admin" })).status).toBe(200);
    expect((await auth(request(app).delete(`/api/users/${users[0]}`))).status).toBe(200);
    users.length = 0;
    expect((await auth(request(app).delete(`/api/categories/${policyCategory}`))).status).toBe(200);
    categories.splice(categories.indexOf(policyCategory), 1);
    expect((await auth(request(app).delete(`/api/categories/${serviceCategory}`))).status).toBe(200);
    categories.splice(categories.indexOf(serviceCategory), 1);

    const result = await auth(request(app).get("/api/audit-logs"))
      .query({ username, module: "Services", action: "Edit" });
    expect(result.status).toBe(200);
    expect(result.body.logs.some((log) => log.details === `Changed service category for: ${name}`)).toBe(true);
    expect(result.body.summary.add).toBeGreaterThanOrEqual(7);
    const logs = await testPool.query("SELECT user_id, action, module, details FROM logs WHERE username = $1", [username]);
    expect(logs.rows.every((row) => row.user_id === actor.id)).toBe(true);
    const details = logs.rows.map((row) => row.details).join("\n");
    expect(details).toContain("Changed default service category to: All Categories");
    expect(details).toContain(`Renamed policy category: ${name} policy to ${name} policy renamed`);
    expect(details).toContain(`Deleted policy category: ${name} policy renamed`);
    expect(details).toContain(`Deleted service category: ${name} renamed`);
    expect(details).toContain("Changed category; Replaced document for policy:");
    expect(details).toContain("Changed permissions");
    expect(details).toContain("Changed role");
    expect(details).toContain("Deactivated");
    expect(details).toContain("Reactivated");
    expect(details).not.toContain("target-password-123");
  });

  it("rolls back business writes when audit insertion fails", async () => {
    const before = await testPool.query("SELECT count(*)::int AS count FROM logs WHERE username = $1", [username]);
    const missing = await auth(request(app).delete("/api/services/2147483647"));
    expect(missing.status).toBe(404);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(auditModel, "insertAuditLog").mockRejectedValueOnce(new Error("audit unavailable"));
    const response = await auth(request(app).post("/api/categories"))
      .send({ name: `${name} rollback`, type: "service" });
    expect(response.status).toBe(500);
    const result = await testPool.query("SELECT id FROM categories WHERE name = $1", [`${name} rollback`]);
    expect(result.rows).toHaveLength(0);
    const after = await testPool.query("SELECT count(*)::int AS count FROM logs WHERE username = $1", [username]);
    expect(after.rows[0].count).toBe(before.rows[0].count);
    vi.restoreAllMocks();
  });

  it("records logout once and returns the newly recorded event via the API", async () => {
    const logout = await request(app).post("/api/auth/logout").set("Cookie", refreshCookie);
    expect(logout.status).toBe(200);
    const result = await auth(request(app).get("/api/audit-logs")).query({ username, action: "Logout" });
    expect(result.status).toBe(200);
    expect(result.body.logs).toHaveLength(1);
    expect(result.body.logs[0].details).toBe("User logged out");
  });

  it("records logout using a verified access token when no refresh token is present", async () => {
    const logout = await auth(request(app).post("/api/auth/logout"));
    expect(logout.status).toBe(200);
    const result = await testPool.query(
      "SELECT count(*)::int AS count FROM logs WHERE username = $1 AND action = 'Logout'",
      [username],
    );
    expect(result.rows[0].count).toBe(2);
  });
});
