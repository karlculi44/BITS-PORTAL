import bcrypt from "bcrypt";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import {
  formatUserAvatar,
  formatUserAvatars,
  removeUserAvatar,
} from "../utils/userAvatar.js";

const allPermissions = {
  canAccessServices: true,
  canAccessPolicies: true,
  canAccessCategories: true,
};

export const getAllUsers = async () => {
  return formatUserAvatars(await userModel.getAllUsers());
};

export const deleteUser = async (userId) => {
  const user = await userModel.deleteUser(userId);

  if (user?.profile_image) {
    await removeUserAvatar(user.profile_image);
  }

  return formatUserAvatar(user);
};

export const createUser = async ({
  firstName,
  lastName,
  username,
  password,
  role,
  profileImage,
  canAccessServices,
  canAccessPolicies,
  canAccessCategories,
}) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await userModel.insertUser({
    firstName,
    lastName,
    username,
    passwordHash,
    role,
    profileImage,
    ...(role === "admin"
      ? allPermissions
      : { canAccessServices, canAccessPolicies, canAccessCategories }),
  });

  return formatUserAvatar(user);
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
  profileImage,
  canAccessServices,
  canAccessPolicies,
  canAccessCategories,
}) => {
  const passwordHash =
    password === undefined ? undefined : await bcrypt.hash(password, 12);

  const previousUser = profileImage
    ? await userModel.getUserById(userId)
    : undefined;

  let user;

  try {
    user = await userModel.updateUser({
      userId,
      firstName,
      lastName,
      username,
      passwordHash,
      role,
      isActive,
      profileImage,
      ...(role === "admin"
        ? allPermissions
        : { canAccessServices, canAccessPolicies, canAccessCategories }),
    });
  } catch (error) {
    if (profileImage) await removeUserAvatar(profileImage);

    if (error.code === "23505") {
      throw new AppError("Username unavailable", 409);
    }

    throw error;
  }

  if (profileImage) {
    if (!user) {
      await removeUserAvatar(profileImage);
    } else if (previousUser?.profile_image) {
      await removeUserAvatar(previousUser.profile_image);
    }
  }

  return formatUserAvatar(user);
};
