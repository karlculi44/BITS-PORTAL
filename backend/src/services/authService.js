import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import * as authModel from "../models/authModel.js";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import { hashToken } from "../utils/hashToken.js";
import { formatUserAvatar } from "../utils/userAvatar.js";
import { recordAuditEvent, withAuditTransaction, withTransaction } from "./auditLogService.js";

const createAccessToken = (user) =>
  jwt.sign(
    { role: user.role },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: String(user.id),
      expiresIn: "15m",
    },
  );

const createRefreshToken = (userId) =>
  jwt.sign({ jti: randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    expiresIn: "7d",
  });

export const loginUser = async ({ username, password }, context) => {
  const user = await userModel.getUserForLogin(username);

  if (!user || !user.is_active) {
    throw new AppError("Invalid username or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user?.password_hash);

  if (!isPasswordValid) {
    throw new AppError("Invalid username or password", 401);
  }

  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("Tokens are not configured");
  }

  const userData = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    profile_image: formatUserAvatar(user).profile_image,
    can_access_services: user.can_access_services,
    can_access_policies: user.can_access_policies,
    can_access_categories: user.can_access_categories,
    created_at: user.created_at,
  };

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const tokenData = {
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  };
  if (context) {
    await withAuditTransaction(
      { ...context, userId: user.id }, "Login", "Auth",
      async (db) => { await authModel.insertRefreshToken(tokenData, db); return user; },
      () => "User logged in successfully",
    );
  } else {
    await authModel.insertRefreshToken(tokenData);
  }

  return {
    user: userData,
    refreshToken,
    accessToken,
  };
};

export const refreshUser = async (refreshToken) => {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("Tokens are not configured");
  }
  if (!refreshToken) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  let claims;
  try {
    claims = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
    throw error;
  }

  const user = await getSessionUser(claims.sub);
  const nextRefreshToken = createRefreshToken(user.id);
  const rotated = await authModel.rotateRefreshToken({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    nextTokenHash: hashToken(nextRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  if (!rotated) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  return {
    user,
    accessToken: createAccessToken(user),
    refreshToken: nextRefreshToken,
  };
};

export const getSessionUser = async (userId) => {
  const user = await userModel.getUserById(userId);
  if (!user || !user.is_active) {
    throw new AppError("Invalid or expired session", 401);
  }
  return formatUserAvatar(user);
};

export const logoutUser = async (refreshToken, context, accessToken) => {
  if (refreshToken) {
    if (!context) {
      await authModel.revokeRefreshToken(hashToken(refreshToken));
      return;
    }
    const revoked = await withTransaction(async (client) => {
      const revoked = await authModel.revokeRefreshToken(hashToken(refreshToken), client);
      if (revoked) {
        const user = await client.query("SELECT username FROM users WHERE id = $1", [revoked.user_id]);
        await recordAuditEvent({
          userId: revoked.user_id, username: user.rows[0]?.username ?? null,
          action: "Logout", module: "Auth", details: "User logged out",
          ipAddress: context.ipAddress,
        }, client);
      }
      return revoked;
    });
    if (revoked) return;
  }
  if (context && accessToken) {
    let claims;
    try {
      claims = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) return;
      throw error;
    }
    const user = await userModel.getUserById(claims.sub);
    if (user) {
      await withAuditTransaction(
        { ...context, userId: user.id }, "Logout", "Auth",
        async () => user,
        () => "User logged out",
      );
    }
  }
};
