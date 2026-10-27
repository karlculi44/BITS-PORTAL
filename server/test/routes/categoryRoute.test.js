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

  describe("DELETE /api/categories/:id", () => {
    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = accessSecret;
      pool.query.mockReset();
    });

    it("deletes a category and returns the deleted record", async () => {
      const category = {
        id: 1,
        name: "Books",
        type: "service",
        is_active: true,
      };
      pool.query.mockResolvedValueOnce({ rows: [category] });

      const response = await request(app)
        .delete("/api/categories/1")
        .set("Cookie", accessCookie("admin"));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Category deleted successfully",
        data: category,
      });
      expect(pool.query.mock.calls[0][0]).toContain("DELETE FROM categories");
      expect(pool.query.mock.calls[0][1]).toEqual(["1"]);
    });

    it("returns 404 when the category does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete("/api/categories/999")
        .set("Cookie", accessCookie("admin"));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Category not found");
    });

    it.each(["invalid", "0", "2147483648"])(
      "rejects invalid category ID %s",
      async (id) => {
        const response = await request(app)
          .delete(`/api/categories/${id}`)
          .set("Cookie", accessCookie("admin"));

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid category ID");
        expect(pool.query).not.toHaveBeenCalled();
      },
    );

    it("requires authentication and admin access", async () => {
      const unauthenticated = await request(app).delete("/api/categories/1");
      const staff = await request(app)
        .delete("/api/categories/1")
        .set("Cookie", accessCookie("staff"));

      expect(unauthenticated.status).toBe(401);
      expect(staff.status).toBe(403);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/categories/:id", () => {
    beforeEach(() => {
      process.env.JWT_ACCESS_SECRET = accessSecret;
      pool.query.mockReset();
    });

    it("updates supplied fields and returns the category", async () => {
      const category = {
        id: 1,
        name: "Updated Books",
        type: "service",
        is_active: false,
      };
      pool.query.mockResolvedValueOnce({ rows: [category] });

      const response = await request(app)
        .patch("/api/categories/1")
        .set("Cookie", accessCookie("admin"))
        .send({ name: "Updated Books", isActive: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(category);
      expect(pool.query.mock.calls[0][0]).toContain("name = $1");
      expect(pool.query.mock.calls[0][0]).toContain("is_active = $2");
      expect(pool.query.mock.calls[0][1]).toEqual([
        "Updated Books",
        false,
        "1",
      ]);
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
        type: "service",
        is_active: true,
      },
      {
        id: 2,
        name: "Bookshop",
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

describe("POST /api/categories", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("creates a category using its name and type", async () => {
    const category = {
      id: 5,
      name: "Student Services",
      type: "service",
      is_active: true,
    };
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [category] });

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", accessCookie("admin"))
      .send({ name: category.name, type: category.type });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(category);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][0]).toContain(
      "INSERT INTO categories (name, type)",
    );
    expect(pool.query.mock.calls[1][1]).toEqual([
      category.name,
      category.type,
    ]);
  });

  it("rejects invalid input and requires administrator access", async () => {
    const invalid = await request(app)
      .post("/api/categories")
      .set("Cookie", accessCookie("admin"))
      .send({ name: "Student Services" });
    const unauthenticated = await request(app)
      .post("/api/categories")
      .send({ name: "Student Services", type: "service" });
    const staff = await request(app)
      .post("/api/categories")
      .set("Cookie", accessCookie("staff"))
      .send({ name: "Student Services", type: "service" });

    expect(invalid.status).toBe(400);
    expect(invalid.body.errors).toBeDefined();
    expect(unauthenticated.status).toBe(401);
    expect(staff.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
