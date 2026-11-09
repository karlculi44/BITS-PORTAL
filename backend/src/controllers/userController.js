import * as userService from "../services/userService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getUserAvatarPath, removeUserAvatar } from "../utils/userAvatar.js";
import { requestAuditContext } from "../services/auditLogService.js";

// Deletes the just-uploaded profile picture if the request fails afterwards.
const withUploadCleanup = (handler) =>
  asyncHandler(async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (req.file?.filename) {
        try {
          await removeUserAvatar(req.file.filename);
        } catch (cleanupError) {
          cleanupError.cause = error;
          throw cleanupError;
        }
      }

      throw error;
    }
  });

export const getAllUsersController = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();

  res.json({
    message: "Users retrieved successfully",
    data: users,
  });
});

export const getUserAvatarController = (req, res, next) => {
  const avatarPath = getUserAvatarPath(req.params.filename);

  if (!avatarPath) {
    next(new AppError("Profile picture not found", 404));
    return;
  }

  res.sendFile(avatarPath, (error) => {
    if (!error) return;

    next(
      error.statusCode === 404
        ? new AppError("Profile picture not found", 404)
        : error,
    );
  });
};

export const deleteUserController = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.params.id, requestAuditContext(req));

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    message: "User deleted successfully",
    data: user,
  });
});

export const createUserController = withUploadCleanup(async (req, res) => {
  const { firstName, lastName, username, password, role } = req.body;

  if (!firstName || !lastName || !username || !password || !role) {
    throw new AppError("All fields are required", 400);
  }

  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : "";

  if (!["admin", "staff"].includes(normalizedRole)) {
    throw new AppError("Role must be either admin or staff", 400);
  }

  const existingUser = await userService.getUserByUsername(username);

  if (existingUser) {
    throw new AppError("Username unavailable", 400);
  }

  const user = await userService.createUser({
    ...req.body,
    role: normalizedRole,
    profileImage: req.file?.filename,
  }, requestAuditContext(req));

  if (!user) {
    throw new AppError("Failed to create user", 400);
  }

  res.status(201).json({
    message: "User created successfully",
    data: user,
  });
});

export const updateUserController = withUploadCleanup(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    password,
    role,
    isActive,
    canAccessServices,
    canAccessPolicies,
    canAccessCategories,
  } = req.body;

  if (username !== undefined) {
    const existingUser = await userService.getUserByUsername(username);

    if (existingUser && String(existingUser.id) !== req.params.id) {
      throw new AppError("Username unavailable", 409);
    }
  }

  const user = await userService.updateUser({
    userId: req.params.id,
    firstName,
    lastName,
    username,
    password,
    role,
    isActive,
    profileImage: req.file?.filename,
    canAccessServices,
    canAccessPolicies,
    canAccessCategories,
  }, requestAuditContext(req));

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    message: "User updated successfully",
    data: user,
  });
});
