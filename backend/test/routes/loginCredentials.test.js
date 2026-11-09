import { afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import express from "express";
import request from "supertest";

vi.mock("../../src/models/userModel.js", () => ({
  getUserForLogin: vi.fn(),
}));
vi.mock("../../src/services/auditLogService.js", async (importOriginal) => ({
  ...await importOriginal(),
  recordAuditEvent: vi.fn(),
}));

import * as userModel from "../../src/models/userModel.js";
import * as auditLogService from "../../src/services/auditLogService.js";
import authRoute from "../../src/routes/authRoute.js";
import errorHandler from "../../src/middlewares/errorHandler.js";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoute);
app.use(errorHandler);

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("login credential errors", () => {
  it("returns the same message for a short incorrect username or password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    userModel.getUserForLogin
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ is_active: true, password_hash: passwordHash });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const wrongUsername = await request(app)
      .post("/api/auth/login")
      .send({ username: "ab", password: "correct-password" });
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "wrong" });

    expect(wrongUsername.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(wrongUsername.body).toEqual({ message: "Invalid credentials." });
    expect(wrongPassword.body).toEqual(wrongUsername.body);
    expect(auditLogService.recordAuditEvent).toHaveBeenCalledTimes(2);
    for (const [index, username] of ["ab", "testuser"].entries()) {
      expect(auditLogService.recordAuditEvent.mock.calls[index][0]).toEqual({
        userId: null,
        username,
        action: "Login Failed",
        module: "Auth",
        details: `Failed login attempt for username: ${username}`,
        ipAddress: expect.any(String),
      });
    }
    expect(JSON.stringify(auditLogService.recordAuditEvent.mock.calls)).not.toContain("correct-password");
    expect(JSON.stringify(auditLogService.recordAuditEvent.mock.calls)).not.toContain("wrong");
  });

  it("records rejected validation without storing the password", async () => {
    const response = await request(app).post("/api/auth/login")
      .send({ username: "", password: "private-password" });
    expect(response.status).toBe(400);
    expect(auditLogService.recordAuditEvent).toHaveBeenCalledWith({
      userId: null, username: "", action: "Login Failed", module: "Auth",
      details: "Failed login attempt", ipAddress: expect.any(String),
    });
    expect(JSON.stringify(auditLogService.recordAuditEvent.mock.calls)).not.toContain("private-password");
    expect(userModel.getUserForLogin).not.toHaveBeenCalled();
  });

  it("reports audit failures rather than silently accepting rejected requests", async () => {
    auditLogService.recordAuditEvent.mockRejectedValueOnce(new Error("audit unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await request(app).post("/api/auth/login")
      .send({ username: "testuser", password: "" });
    expect(response.status).toBe(500);
  });
});
