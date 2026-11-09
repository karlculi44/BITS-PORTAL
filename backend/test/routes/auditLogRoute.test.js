import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

vi.mock("../../src/models/userModel.js", () => ({ getUserById: vi.fn() }));
vi.mock("../../src/services/auditLogService.js", () => ({ getAuditLogs: vi.fn() }));

import * as userModel from "../../src/models/userModel.js";
import * as auditLogService from "../../src/services/auditLogService.js";
import auditLogRoute from "../../src/routes/auditLogRoute.js";
import errorHandler from "../../src/middlewares/errorHandler.js";

const app = express();
app.use("/api/audit-logs", auditLogRoute);
app.use(errorHandler);

const token = (role) => jwt.sign({ role }, "audit-test-secret", { subject: "1" });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("audit logs retrieval", () => {
  it("requires authentication and checks the current user's role", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "audit-test-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await request(app).get("/api/audit-logs")).status).toBe(401);
    userModel.getUserById.mockResolvedValue({ role: "staff", is_active: true });
    const response = await request(app).get("/api/audit-logs")
      .set("Authorization", `Bearer ${token("admin")}`);
    expect(response.status).toBe(403);
    expect(auditLogService.getAuditLogs).not.toHaveBeenCalled();
  });

  it("passes valid filters to the service for active admins", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "audit-test-secret");
    userModel.getUserById.mockResolvedValue({ role: "admin", is_active: true });
    const result = { logs: [], summary: { total: 0, modules: [] } };
    auditLogService.getAuditLogs.mockResolvedValue(result);
    const filters = {
      module: "Categories",
      action: "Edit",
      username: "Karl",
      start: "2026-03-15T16:00:00.000Z",
      end: "2026-03-16T16:00:00.000Z",
    };
    const response = await request(app).get("/api/audit-logs")
      .set("Authorization", `Bearer ${token("admin")}`).query(filters);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(filters);
  });

  it("rejects malformed or incomplete date bounds", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "audit-test-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    userModel.getUserById.mockResolvedValue({ role: "admin", is_active: true });
    const response = await request(app).get("/api/audit-logs")
      .set("Authorization", `Bearer ${token("admin")}`)
      .query({ start: "2026-03-16T00:00:00Z" });
    expect(response.status).toBe(400);
    expect(auditLogService.getAuditLogs).not.toHaveBeenCalled();
  });
});
