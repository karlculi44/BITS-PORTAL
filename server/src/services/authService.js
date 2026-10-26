import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as authModel from "../models/authModel.js";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import { hashToken } from "../utils/hashToken.js";

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

  const accessToken = jwt.sign(
    { role: user.role },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: String(user.id),
      expiresIn: "15m",
    },
  );

  const refreshToken = jwt.sign({}, process.env.JWT_REFRESH_SECRET, {
    subject: String(user.id),
    expiresIn: "7d",
  });

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
