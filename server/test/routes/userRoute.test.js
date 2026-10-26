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
  const token = jwt.sign({ role }, accessSecret, { subject: "1" });
  return `accessToken=${token}`;
};

describe("PATCH /api/users/:id", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("updates editable fields and returns no authentication secrets", async () => {
    const updatedAt = "2026-10-26T08:00:00.000Z";
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          first_name: "Updated",
          last_name: "Name",
          username: "updateduser",
          role: "staff",
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: updatedAt,
        },
      ],
    });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("admin"))
      .send({ firstName: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "User updated successfully",
      data: {
        id: 1,
        first_name: "Updated",
        last_name: "Name",
        username: "updateduser",
        role: "staff",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: updatedAt,
      },
    });
    expect(pool.query.mock.calls[0][0]).toContain(
      "updated_at = CURRENT_TIMESTAMP",
    );
    expect(pool.query.mock.calls[0][0]).toContain("first_name = $1");
    expect(pool.query.mock.calls[0][0]).not.toContain("last_name =");
    expect(pool.query.mock.calls[0][0]).not.toContain("username =");
    expect(pool.query.mock.calls[0][0]).not.toContain("password_hash =");
    expect(pool.query.mock.calls[0][1]).toEqual(["Updated", "1"]);
    expect(response.body.data).not.toHaveProperty("password_hash");
  });

  it("returns 404 when the user does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .patch("/api/users/999")
      .set("Cookie", accessCookie("admin"))
      .send({ firstName: "Updated" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  it("rejects a username already used by another account", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("admin"))
      .send({ username: "existinguser" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Username unavailable");
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("maps a concurrent username conflict to a client error", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(Object.assign(new Error("Unique violation"), {
        code: "23505",
      }));

    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("admin"))
      .send({ username: "updateduser" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Username unavailable");
  });

  it("rejects invalid input", async () => {
    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("admin"))
      .send({ username: "short" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("does not allow staff to update a user", async () => {
    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("staff"))
      .send({ firstName: "Updated" });

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("does not allow staff to update administrative fields", async () => {
    const response = await request(app)
      .patch("/api/users/1")
      .set("Cookie", accessCookie("staff"))
      .send({ role: "admin", isActive: false });

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
