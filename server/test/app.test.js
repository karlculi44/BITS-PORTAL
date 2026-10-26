import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("app", () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it("reports a healthy database from the health endpoint", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });
});
