import bcrypt from "bcrypt";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";

export const getAllUsers = async () => {
  return await userModel.getAllUsers();
};

export const createUser = async ({
  firstName,
  lastName,
  username,
  password,
  role,
}) => {
  const passwordHash = await bcrypt.hash(password, 12);

  return await userModel.insertUser({
    firstName,
    lastName,
    username,
    passwordHash,
    role,
  });
};

export const getUserByUsername = async (username) => {
  return await userModel.getUserByUsername(username);
};

export const updateUser = async ({
  userId,
  firstName,
  lastName,
  username,
  password,
  role,
  isActive,
}) => {
  const passwordHash =
    password === undefined ? undefined : await bcrypt.hash(password, 12);

  try {
    return await userModel.updateUser({
      userId,
      firstName,
      lastName,
      username,
      passwordHash,
      role,
      isActive,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Username unavailable", 409);
    }

    throw error;
  }
};
