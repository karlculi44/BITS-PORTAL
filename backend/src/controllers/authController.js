import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as authService from "../services/authService.js";
import {
  recordAuditEvent,
  requestAuditContext,
} from "../services/auditLogService.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
});

export const recordFailedLogin = async (req) => {
  const username =
    typeof req.body?.username === "string" ? req.body.username : null;
  await recordAuditEvent({
    ...requestAuditContext(req),
    userId: null,
    username,
    action: "Login Failed",
    module: "Auth",
    details: username
      ? `Failed login attempt for ${username}`
      : "Failed login attempt",
  });
};

export const loginUserController = asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof password !== "string" ||
    !password.trim()
  ) {
    await recordFailedLogin(req);
    throw new AppError("Username and password are required", 400);
  }

  let session;
  try {
    session = await authService.loginUser(
      { username, password },
      requestAuditContext(req),
    );
  } catch (error) {
    await recordFailedLogin(req);
    throw error;
  }
  const { user, accessToken, refreshToken } = session;

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
  const accessToken =
    req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ??
    req.cookies?.accessToken;
  await authService.logoutUser(
    req.cookies?.refreshToken,
    requestAuditContext(req),
    accessToken,
  );
  res.clearCookie("accessToken", cookieOptions());
  res.clearCookie("refreshToken", cookieOptions());
  res.json({ message: "Logout successful" });
});
