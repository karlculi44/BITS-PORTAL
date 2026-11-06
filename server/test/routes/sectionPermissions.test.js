import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

const accessSecret = "test-access-secret";

const accessCookie = (role) => {
  const token = jwt.sign({ role }, accessSecret, { subject: "7" });
  return `accessToken=${token}`;
};

const staffRow = (permissions = {}) => ({
  id: 7,
  role: "staff",
  is_active: true,
  can_access_services: false,
  can_access_policies: false,
  can_access_categories: false,
  ...permissions,
});

describe("section authorization", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("allows staff with the matching section permission", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [staffRow({ can_access_policies: true })] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(200);
  });

  it("blocks staff that only have a different section permission", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [staffRow({ can_access_services: true })],
    });

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("blocks deactivated staff even with a permission", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [staffRow({ can_access_policies: true, is_active: false })],
    });

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(403);
  });

  it("lets staff with services access read categories", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [staffRow({ can_access_services: true })] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get("/api/categories")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(200);
  });

  it("does not query permissions for admins", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe("user permissions API", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  const createdRow = { id: 9, username: "newuser01", role: "staff" };

  it("stores the selected staff permissions", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createdRow] });

    const response = await request(app)
      .post("/api/users")
      .set("Cookie", accessCookie("admin"))
      .send({
        firstName: "New",
        lastName: "User",
        username: "newuser01",
        password: "password123",
        role: "staff",
        canAccessServices: true,
        canAccessCategories: true,
      });

    expect(response.status).toBe(201);
    const values = pool.query.mock.calls[1][1];
    expect(values.slice(6)).toEqual([true, false, true]);
  });

  it("forces full access when creating an admin", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...createdRow, role: "admin" }] });

    await request(app)
      .post("/api/users")
      .set("Cookie", accessCookie("admin"))
      .send({
        firstName: "New",
        lastName: "Admin",
        username: "newadmin1",
        password: "password123",
        role: "admin",
      });

    expect(pool.query.mock.calls[1][1].slice(6)).toEqual([true, true, true]);
  });

  it("forces full access when promoting a user to admin", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 9, role: "admin" }] });

    const response = await request(app)
      .patch("/api/users/9")
      .set("Cookie", accessCookie("admin"))
      .send({ role: "admin", canAccessServices: false });

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual(["admin", true, true, true, "9"]);
  });

  it("accepts multipart booleans and leaves the password untouched", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 9, role: "staff" }] });

    const response = await request(app)
      .patch("/api/users/9")
      .set("Cookie", accessCookie("admin"))
      .field("canAccessPolicies", "true");

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).not.toContain("password_hash =");
    expect(pool.query.mock.calls[0][1]).toEqual([true, "9"]);
  });

  it("never selects password hashes when listing users", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(app)
      .get("/api/users")
      .set("Cookie", accessCookie("admin"));

    expect(pool.query.mock.calls[0][0]).not.toContain("password_hash");
    expect(pool.query.mock.calls[0][0]).toContain("can_access_services");
  });

  it("rejects non-boolean permission values", async () => {
    const response = await request(app)
      .patch("/api/users/9")
      .set("Cookie", accessCookie("admin"))
      .send({ canAccessServices: "yes" });

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
