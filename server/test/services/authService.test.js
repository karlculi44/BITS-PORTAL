import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

vi.mock("../../src/models/authModel.js", () => ({
  insertRefreshToken: vi.fn(),
}));

vi.mock("../../src/models/userModel.js", () => ({
  getUserForLogin: vi.fn(),
}));

import * as authModel from "../../src/models/authModel.js";
import * as userModel from "../../src/models/userModel.js";
import { loginUser } from "../../src/services/authService.js";
import { hashToken } from "../../src/utils/hashToken.js";

const user = {
  id: 7,
  first_name: "Test",
  last_name: "User",
  username: "testuser",
  password_hash: "",
  role: "staff",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("loginUser", () => {
  beforeEach(async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret");
    userModel.getUserForLogin.mockReset();
    authModel.insertRefreshToken.mockReset();
    user.password_hash = await bcrypt.hash("correct-password", 4);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unknown and inactive users with the same unauthorized error", async () => {
    userModel.getUserForLogin.mockResolvedValueOnce(undefined);

    await expect(
      loginUser({ username: "unknown", password: "correct-password" }),
    ).rejects.toMatchObject({
      message: "Invalid username or password",
      statusCode: 401,
    });

    userModel.getUserForLogin.mockResolvedValueOnce({
      ...user,
      is_active: false,
    });

    await expect(
      loginUser({ username: user.username, password: "correct-password" }),
    ).rejects.toMatchObject({
      message: "Invalid username or password",
      statusCode: 401,
    });
    expect(authModel.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password", async () => {
    userModel.getUserForLogin.mockResolvedValueOnce(user);

    await expect(
      loginUser({ username: user.username, password: "wrong-password" }),
    ).rejects.toMatchObject({
      message: "Invalid username or password",
      statusCode: 401,
    });
    expect(authModel.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("issues tokens and stores only a hash of the refresh token", async () => {
    userModel.getUserForLogin.mockResolvedValueOnce(user);

    const result = await loginUser({
      username: user.username,
      password: "correct-password",
    });

    expect(result.user).toEqual({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    });
    expect(result.user).not.toHaveProperty("password_hash");

    const accessClaims = JSON.parse(
      Buffer.from(result.accessToken.split(".")[1], "base64url").toString(),
    );
    const refreshClaims = JSON.parse(
      Buffer.from(result.refreshToken.split(".")[1], "base64url").toString(),
    );

    expect(accessClaims).toMatchObject({
      role: user.role,
      sub: String(user.id),
    });
    expect(refreshClaims.sub).toBe(String(user.id));
    expect(authModel.insertRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        tokenHash: hashToken(result.refreshToken),
        expiresAt: expect.any(Date),
      }),
    );
    expect(authModel.insertRefreshToken.mock.calls[0][0].tokenHash).not.toBe(
      result.refreshToken,
    );
  });

  it("fails when token secrets are not configured", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", "");
    userModel.getUserForLogin.mockResolvedValueOnce(user);

    await expect(
      loginUser({ username: user.username, password: "correct-password" }),
    ).rejects.toThrow("Tokens are not configured");
    expect(authModel.insertRefreshToken).not.toHaveBeenCalled();
  });
});
