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

describe("GET /api/categories/:name", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("returns the category matching the requested name", async () => {
    const category = {
      id: 1,
      name: "Books",
      description: "Reading materials",
      type: "service",
      is_active: true,
    };
    pool.query.mockResolvedValueOnce({ rows: [category] });

    const response = await request(app)
      .get("/api/categories/Books")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(category);
    expect(pool.query.mock.calls[0][0]).toContain("WHERE name = $1");
    expect(pool.query.mock.calls[0][1]).toEqual(["Books"]);
  });

  it("returns 404 when no category has the requested name", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get("/api/categories/Unknown")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Category not found");
  });

  it("does not allow staff to retrieve a category", async () => {
    const response = await request(app)
      .get("/api/categories/Books")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
