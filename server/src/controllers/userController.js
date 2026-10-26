import * as userService from "../services/userService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

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
    throw new AppError("User with this username already exists", 400);
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
