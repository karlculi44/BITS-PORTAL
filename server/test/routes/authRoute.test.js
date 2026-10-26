import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/services/authService.js", () => ({
  loginUser: vi.fn(),
}));

import app from "../../src/app.js";
import * as authService from "../../src/services/authService.js";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    authService.loginUser.mockReset();
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
