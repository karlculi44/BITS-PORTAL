import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as authService from "../services/authService.js";

export const loginUserController = asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof password !== "string" ||
    !password.trim()
  ) {
    throw new AppError("Username and password are required", 400);
  }

  const { user, accessToken, refreshToken } = await authService.loginUser({
    username,
    password,
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: "Login successful",
    data: user,
  });
});
