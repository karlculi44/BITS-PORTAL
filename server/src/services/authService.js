import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import * as authModel from "../models/authModel.js";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import { hashToken } from "../utils/hashToken.js";

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

export const loginUser = async ({ username, password }) => {
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
    created_at: user.created_at,
  };

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await authModel.insertRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

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
  return user;
};

export const logoutUser = async (refreshToken) => {
  if (refreshToken) {
    await authModel.revokeRefreshToken(hashToken(refreshToken));
  }
};
