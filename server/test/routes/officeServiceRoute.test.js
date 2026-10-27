import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const validInput = {
  title: "Transcript Request",
  url: "https://example.com/transcript",
  description: "Request an official transcript",
  category_id: 3,
};

const accessCookie = (role) => {
  const token = jwt.sign({ role }, accessSecret, { subject: "1" });
  return `accessToken=${token}`;
};

describe("POST /api/services", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a service and uses database defaults for omitted optional fields", async () => {
    const service = {
      id: 9,
      ...validInput,
      image: null,
      sort_order: 0,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockResolvedValueOnce({ rows: [service] });

    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(validInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "Service created successfully",
      data: service,
    });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][1]).toEqual([3]);
    expect(pool.query.mock.calls[1][0]).toMatch(
      /INSERT INTO services \(title, url, image, description, category_id\)/,
    );
    expect(pool.query.mock.calls[1][1]).toEqual([
      validInput.title,
      validInput.url,
      null,
      validInput.description,
      validInput.category_id,
    ]);
  });

  it("creates a service with image and sort order when supplied", async () => {
    const input = {
      ...validInput,
      image: "https://example.com/image.png",
      sort_order: 4,
    };
    const service = {
      id: 9,
      ...input,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockResolvedValueOnce({ rows: [service] });

    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(input);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(service);
    expect(pool.query.mock.calls[1][0]).toContain("sort_order");
    expect(pool.query.mock.calls[1][1]).toEqual([
      input.title,
      input.url,
      input.image,
      input.description,
      input.sort_order,
      input.category_id,
    ]);
  });

  it.each([
    [{ url: validInput.url, category_id: 3 }, "missing title"],
    [{ title: validInput.title, category_id: 3 }, "missing URL"],
    [
      {
        title: validInput.title,
        url: validInput.url,
        category_id: 3,
      },
      "missing description",
    ],
    [{ title: validInput.title, url: validInput.url }, "missing category ID"],
    [{ ...validInput, title: "" }, "empty title"],
    [{ ...validInput, title: 5 }, "invalid title type"],
    [{ ...validInput, url: "not-a-url" }, "invalid URL"],
    [{ ...validInput, url: 5 }, "invalid URL type"],
    [{ ...validInput, image: 5 }, "invalid image type"],
    [{ ...validInput, sort_order: 1.5 }, "fractional sort order"],
    [{ ...validInput, sort_order: "1" }, "invalid sort order type"],
    [{ ...validInput, sort_order: 2147483648 }, "out-of-range sort order"],
    [{ ...validInput, category_id: "3" }, "invalid category ID type"],
    [{ ...validInput, category_id: 0 }, "nonpositive category ID"],
    [{ ...validInput, category_id: 1.5 }, "fractional category ID"],
  ])("rejects %s", async (body) => {
    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("allows an omitted image and explicit null image", async () => {
    const inputWithNullImage = { ...validInput, image: null };
    for (const body of [validInput, inputWithNullImage]) {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
        .mockResolvedValueOnce({ rows: [{ id: 9, ...body, image: null }] });

      const response = await request(app)
        .post("/api/services")
        .set("Cookie", accessCookie("admin"))
        .send(body);

      expect(response.status).toBe(201);
      pool.query.mockReset();
    }
  });

  it("rejects nonexistent and policy categories before inserting", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 4, type: "policy" }] });

    const missingCategory = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(validInput);
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.message).toBe("Category not found");
    expect(pool.query).toHaveBeenCalledTimes(1);

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 4, type: "policy" }] });
    const policyCategory = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send({ ...validInput, category_id: 4 });

    expect(policyCategory.status).toBe(400);
    expect(policyCategory.body.message).toBe(
      "Category must be a service category",
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("maps a category foreign-key race to not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockRejectedValueOnce({ code: "23503" });

    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(validInput);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Category not found");
  });

  it("does not expose unexpected database errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("database credentials leaked"));

    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .send(validInput);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
    expect(JSON.stringify(response.body)).not.toContain(
      "database credentials leaked",
    );
    consoleError.mockRestore();
  });

  it("requires authentication and admin authorization", async () => {
    const unauthenticated = await request(app)
      .post("/api/services")
      .send(validInput);
    const staff = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("staff"))
      .send(validInput);

    expect(unauthenticated.status).toBe(401);
    expect(staff.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
