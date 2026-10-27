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

  describe("PATCH /api/categories/:id", () => {
    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = accessSecret;
      pool.query.mockReset();
    });

    it("updates supplied fields and returns the category", async () => {
      const category = {
        id: 1,
        name: "Books",
        description: "Updated",
        type: "service",
        is_active: false,
      };
      pool.query.mockResolvedValueOnce({ rows: [category] });

      const response = await request(app)
        .patch("/api/categories/1")
        .set("Cookie", accessCookie("admin"))
        .send({ description: "Updated", isActive: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(category);
      expect(pool.query.mock.calls[0][0]).toContain("description = $1");
      expect(pool.query.mock.calls[0][0]).toContain("is_active = $2");
      expect(pool.query.mock.calls[0][1]).toEqual(["Updated", false, "1"]);
    });

    it("returns 404 for a category that does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch("/api/categories/999")
        .set("Cookie", accessCookie("admin"))
        .send({ name: "Books" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Category not found");
    });

    it("returns 409 for a duplicate name", async () => {
      pool.query.mockRejectedValueOnce({ code: "23505" });

      const response = await request(app)
        .patch("/api/categories/1")
        .set("Cookie", accessCookie("admin"))
        .send({ name: "Books" });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Category already exists");
    });

    it.each(["invalid", "0", "2147483648"])(
      "rejects invalid category ID %s",
      async (id) => {
        const response = await request(app)
          .patch(`/api/categories/${id}`)
          .set("Cookie", accessCookie("admin"))
          .send({ name: "Books" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid category ID");
        expect(pool.query).not.toHaveBeenCalled();
      },
    );

    it.each([
      {},
      { name: "" },
      { description: "" },
      { type: "other" },
      { isActive: "false" },
      { unknown: "value" },
    ])("rejects invalid update input %j", async (body) => {
      const response = await request(app)
        .patch("/api/categories/1")
        .set("Cookie", accessCookie("admin"))
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("requires authentication and admin access", async () => {
      const unauthenticated = await request(app)
        .patch("/api/categories/1")
        .send({ name: "Books" });
      const staff = await request(app)
        .patch("/api/categories/1")
        .set("Cookie", accessCookie("staff"))
        .send({ name: "Books" });

      expect(unauthenticated.status).toBe(401);
      expect(staff.status).toBe(403);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  it("returns all categories containing the requested name", async () => {
    const categories = [
      {
        id: 1,
        name: "Books",
        description: "Reading materials",
        type: "service",
        is_active: true,
      },
      {
        id: 2,
        name: "Bookshop",
        description: "Book sales",
        type: "service",
        is_active: true,
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: categories });

    const response = await request(app)
      .get("/api/categories/Book")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(categories);
    expect(pool.query.mock.calls[0][0]).toContain("POSITION($1 IN name) > 0");
    expect(pool.query.mock.calls[0][1]).toEqual(["Book"]);
  });

  it("returns an empty array when no category contains the requested name", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get("/api/categories/Unknown")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("does not allow staff to retrieve a category", async () => {
    const response = await request(app)
      .get("/api/categories/Books")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
