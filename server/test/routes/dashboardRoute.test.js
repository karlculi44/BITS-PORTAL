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

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("returns dashboard counts to admins", async () => {
    const dashboardData = {
      total_users: 5,
      active_users: 4,
      inactive_users: 1,
      total_categories: 6,
      active_categories: 5,
      inactive_categories: 1,
      total_services: 8,
      total_policies: 3,
      services_by_category: [{ name: "IT Services", count: 5 }],
      policies_by_category: [{ name: "Academic Policies", count: 3 }],
    };
    pool.query.mockResolvedValueOnce({ rows: [dashboardData] });

    const response = await request(app)
      .get("/api/dashboard")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Dashboard data retrieved successfully",
      data: dashboardData,
    });
    expect(pool.query).toHaveBeenCalledOnce();
    expect(pool.query.mock.calls[0][0]).toContain("FROM users");
    expect(pool.query.mock.calls[0][0]).toContain("FROM categories");
    expect(pool.query.mock.calls[0][0]).toContain("FROM services");
    expect(pool.query.mock.calls[0][0]).toContain("FROM policies");
    expect(pool.query.mock.calls[0][0]).toContain("categories.type = 'service'");
    expect(pool.query.mock.calls[0][0]).toContain("categories.type = 'policy'");
    expect(response.body.data.services_by_category).toEqual([
      { name: "IT Services", count: 5 },
    ]);
    expect(response.body.data.policies_by_category).toEqual([
      { name: "Academic Policies", count: 3 },
    ]);
  });

  it("does not allow staff to access dashboard data", async () => {
    const response = await request(app)
      .get("/api/dashboard")
      .set("Cookie", accessCookie("staff"));

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("uses the existing error response when the database query fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const response = await request(app)
      .get("/api/dashboard")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
  });
});
