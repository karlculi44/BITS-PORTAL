import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as authService from "../services/authService.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
});

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
    ...cookieOptions(),
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: "Login successful",
    data: user,
    accessToken,
  });
});

export const getSessionController = asyncHandler(async (req, res) => {
  const user = await authService.getSessionUser(req.user.sub);
  res.json({ message: "Session retrieved successfully", data: user });
});

export const refreshUserController = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refreshUser(
    req.cookies?.refreshToken,
  );

  res.cookie("accessToken", accessToken, {
    ...cookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({
    message: "Session refreshed successfully",
    data: user,
    accessToken,
  });
});

export const logoutUserController = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.cookies?.refreshToken);
  res.clearCookie("accessToken", cookieOptions());
  res.clearCookie("refreshToken", cookieOptions());
  res.json({ message: "Logout successful" });
});
