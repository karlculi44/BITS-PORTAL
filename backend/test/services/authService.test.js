import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

vi.mock("../../src/models/authModel.js", () => ({
  insertRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

vi.mock("../../src/models/userModel.js", () => ({
  getUserForLogin: vi.fn(),
  getUserById: vi.fn(),
}));

import * as authModel from "../../src/models/authModel.js";
import * as userModel from "../../src/models/userModel.js";
import {
  getSessionUser,
  loginUser,
  logoutUser,
  refreshUser,
} from "../../src/services/authService.js";
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
    userModel.getUserById.mockReset();
    authModel.insertRefreshToken.mockReset();
    authModel.rotateRefreshToken.mockReset();
    user.password_hash = await bcrypt.hash("correct-password", 4);
  });

  describe("session and logout", () => {
    it("returns an active user and rejects missing or inactive users", async () => {
      const active = { id: 7, is_active: true };
      userModel.getUserById.mockResolvedValueOnce(active).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ...active, is_active: false });
      await expect(getSessionUser("7")).resolves.toEqual(active);
      await expect(getSessionUser("7")).rejects.toMatchObject({ statusCode: 401 });
      await expect(getSessionUser("7")).rejects.toMatchObject({ statusCode: 401 });
    });

    it("revokes only the hash of the supplied refresh token", async () => {
      authModel.revokeRefreshToken.mockReset();
      await logoutUser("refresh-token");
      expect(authModel.revokeRefreshToken).toHaveBeenCalledWith(hashToken("refresh-token"));
      await logoutUser(undefined);
      expect(authModel.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });
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

  it("rotates a valid refresh token and issues a new access token", async () => {
    userModel.getUserById.mockResolvedValueOnce({
      id: user.id,
      role: user.role,
      is_active: true,
    });
    authModel.rotateRefreshToken.mockResolvedValueOnce(true);
    const refreshToken = jwt.sign(
      { jti: "old-token" },
      "test-refresh-secret",
      { subject: String(user.id), expiresIn: "7d" },
    );

    const result = await refreshUser(refreshToken);

    expect(result.user.id).toBe(user.id);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(authModel.rotateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        nextTokenHash: hashToken(result.refreshToken),
        expiresAt: expect.any(Date),
      }),
    );
  });

  it("rejects a reused refresh token without issuing credentials", async () => {
    userModel.getUserById.mockResolvedValueOnce({
      id: user.id,
      role: user.role,
      is_active: true,
    });
    authModel.rotateRefreshToken.mockResolvedValueOnce(false);
    const refreshToken = jwt.sign(
      { jti: "reused-token" },
      "test-refresh-secret",
      { subject: String(user.id), expiresIn: "7d" },
    );

    await expect(refreshUser(refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects an invalid refresh token", async () => {
    await expect(refreshUser("invalid-token")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(userModel.getUserById).not.toHaveBeenCalled();
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
