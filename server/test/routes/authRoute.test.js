import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../../src/services/authService.js", () => ({
  loginUser: vi.fn(),
  getSessionUser: vi.fn(),
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

    it("revokes the refresh token and clears both cookies on logout", async () => {
      const response = await request(app).post("/api/auth/logout").set("Cookie", "refreshToken=refresh-token");

      expect(response.status).toBe(200);
      expect(authService.logoutUser).toHaveBeenCalledWith("refresh-token");
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
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken=access-token"),
        expect.stringContaining("refreshToken=refresh-token"),
      ]),
    );
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
  });

  it("rejects invalid login input without calling the auth service", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "ab", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(authService.loginUser).not.toHaveBeenCalled();
  });

  it("returns unauthorized when the credentials are invalid", async () => {
    authService.loginUser.mockRejectedValueOnce(
      Object.assign(new Error("Invalid username or password"), {
        statusCode: 401,
      }),
    );
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "password123" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid username or password");
    } finally {
      errorLogger.mockRestore();
    }
  });
});
