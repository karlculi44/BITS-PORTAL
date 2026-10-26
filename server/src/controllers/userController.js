import * as userService from "../services/userService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const getAllUsersController = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();

  res.json({
    message: "Users retrieved successfully",
    data: users,
  });
});

export const deleteUserController = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    message: "User deleted successfully",
    data: user,
  });
});

export const createUserController = asyncHandler(async (req, res, next) => {
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
  });

  if (!user) {
    throw new AppError("Failed to create user", 400);
  }

  res.status(201).json({
    message: "User created successfully",
    data: user,
  });
});

export const updateUserController = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, password, role, isActive } = req.body;

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
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    message: "User updated successfully",
    data: user,
  });
});
