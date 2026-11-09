import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../../src/services/auditLogService.js", () => ({
  requestAuditContext: () => ({ userId: null, ipAddress: null }),
  recordAuditEvent: vi.fn(),
}));

vi.mock("../../src/services/authService.js", () => ({
  loginUser: vi.fn(),
  getSessionUser: vi.fn(),
  refreshUser: vi.fn(),
  logoutUser: vi.fn(),
}));

import app from "../../src/app.js";
import * as authService from "../../src/services/authService.js";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    authService.loginUser.mockReset();
  });

  describe("authentication session", () => {
    beforeEach(() => {
      vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret");
      authService.getSessionUser.mockReset();
      authService.refreshUser.mockReset();
      authService.logoutUser.mockReset();
      authService.logoutUser.mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns the current user for a valid access cookie, including staff", async () => {
      const user = { id: 7, first_name: "Test", role: "staff", is_active: true };
      authService.getSessionUser.mockResolvedValueOnce(user);
      const token = jwt.sign({ role: "staff" }, "test-access-secret", { subject: "7" });

      const response = await request(app).get("/api/auth/session").set("Cookie", `accessToken=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(user);
      expect(authService.getSessionUser).toHaveBeenCalledWith("7");
    });

    it("rejects missing and invalid access cookies", async () => {
      expect((await request(app).get("/api/auth/session")).status).toBe(401);
      expect((await request(app).get("/api/auth/session").set("Cookie", "accessToken=invalid")).status).toBe(401);
      const expired = jwt.sign({ role: "staff" }, "test-access-secret", { subject: "7", expiresIn: -1 });
      expect((await request(app).get("/api/auth/session").set("Cookie", `accessToken=${expired}`)).status).toBe(401);
      expect(authService.getSessionUser).not.toHaveBeenCalled();
    });

    it("rotates the refresh cookie and returns a new access token", async () => {
      const user = { id: 7, first_name: "Test", role: "staff", is_active: true };
      authService.refreshUser.mockResolvedValueOnce({
        user,
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const response = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", "refreshToken=old-refresh-token");

      expect(response.status).toBe(200);
      expect(authService.refreshUser).toHaveBeenCalledWith("old-refresh-token");
      expect(response.body).toEqual({
        message: "Session refreshed successfully",
        data: user,
        accessToken: "new-access-token",
      });
      expect(response.headers["set-cookie"]).toEqual(
        expect.arrayContaining([
          expect.stringContaining("accessToken=new-access-token"),
          expect.stringContaining("refreshToken=new-refresh-token"),
        ]),
      );
    });

    it("revokes the refresh token and clears both cookies on logout", async () => {
      const response = await request(app).post("/api/auth/logout").set("Cookie", "refreshToken=refresh-token");

      expect(response.status).toBe(200);
      expect(authService.logoutUser).toHaveBeenCalledWith("refresh-token", { userId: null, ipAddress: null }, undefined);
      expect(response.headers["set-cookie"]).toEqual(expect.arrayContaining([
        expect.stringMatching(/^accessToken=;.*Expires=Thu, 01 Jan 1970/),
        expect.stringMatching(/^refreshToken=;.*Expires=Thu, 01 Jan 1970/),
      ]));
    });

    it("does not report logout success if revocation fails", async () => {
      authService.logoutUser.mockRejectedValueOnce(new Error("database unavailable"));
      const errorLogger = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const response = await request(app).post("/api/auth/logout").set("Cookie", "refreshToken=refresh-token");
        expect(response.status).toBe(500);
        expect(response.headers["set-cookie"]).toBeUndefined();
      } finally {
        errorLogger.mockRestore();
      }
    });
  });

  it("returns the user and sets authentication cookies after login", async () => {
    authService.loginUser.mockResolvedValueOnce({
      user: {
        id: 1,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        role: "staff",
        is_active: true,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Login successful",
      data: {
        id: 1,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        role: "staff",
        is_active: true,
      },
      accessToken: "access-token",
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken=access-token"),
        expect.stringContaining("refreshToken=refresh-token"),
      ]),
    );
    expect(response.body).not.toHaveProperty("refreshToken");
  });

  it.each([
    [{ username: "", password: "password" }, "Username is required"],
    [{ username: "testuser", password: "" }, "Password is required"],
    [{ username: " ", password: "password" }, "Username is required"],
    [{ username: "testuser", password: " " }, "Password is required"],
  ])("rejects empty login fields without calling the auth service", async (input, message) => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(input);

    expect(response.status).toBe(400);
    expect(response.body.errors[0].message).toBe(message);
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  it.each([
    { username: "testuser", password: "wrong" },
    { username: "ab", password: "password123" },
  ])("passes nonempty credentials to authentication and returns its error", async (input) => {
    authService.loginUser.mockRejectedValueOnce(
      Object.assign(new Error("Invalid credentials."), {
        statusCode: 401,
      }),
    );
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/auth/login")
        .send(input);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials.");
      expect(authService.loginUser).toHaveBeenCalledWith(
        input,
        { userId: null, ipAddress: null },
      );
    } finally {
      errorLogger.mockRestore();
    }
  });
});
