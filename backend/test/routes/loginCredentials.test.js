import { afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import express from "express";
import request from "supertest";

vi.mock("../../src/models/userModel.js", () => ({
  getUserForLogin: vi.fn(),
}));
vi.mock("../../src/services/auditLogService.js", () => ({
  requestAuditContext: () => ({ userId: null, ipAddress: null }),
  recordAuditEvent: vi.fn(),
  withAuditTransaction: vi.fn(),
  withTransaction: vi.fn(),
}));

import * as userModel from "../../src/models/userModel.js";
import authRoute from "../../src/routes/authRoute.js";
import errorHandler from "../../src/middlewares/errorHandler.js";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoute);
app.use(errorHandler);

afterEach(() => {
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
  });
});
