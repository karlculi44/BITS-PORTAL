import bcrypt from "bcrypt";
import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import { withAuditTransaction } from "./auditLogService.js";
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

export const deleteUser = async (userId, context) => {
  const user = context
    ? await withAuditTransaction(context, "Delete", "Users",
      (db) => userModel.deleteUser(userId, db),
      (deleted) => `Deleted user account: ${deleted.username}`)
    : await userModel.deleteUser(userId);

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
}, context) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const fields = {
    firstName,
    lastName,
    username,
    passwordHash,
    role,
    profileImage,
    ...(role === "admin"
      ? allPermissions
      : { canAccessServices, canAccessPolicies, canAccessCategories }),
  };
  const user = context
    ? await withAuditTransaction(context, "Add", "Users",
      (db) => userModel.insertUser(fields, db),
      (created) => `Created user account: ${created.username}`)
    : await userModel.insertUser(fields);

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
}, context) => {
  const passwordHash =
    password === undefined ? undefined : await bcrypt.hash(password, 12);

  const previousUser = profileImage
    ? await userModel.getUserById(userId)
    : undefined;

  let user;

  try {
    const fields = {
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
    };
    user = context
      ? await withAuditTransaction(context, "Edit", "Users",
        (db) => userModel.updateUser(fields, db),
        (updated) => {
          const changes = [];
          if (isActive !== undefined && updated.previous_active !== isActive) changes.push(isActive ? "Reactivated" : "Deactivated");
          if (role !== undefined && updated.previous_role !== role) changes.push("Changed role");
          if (
            (canAccessServices !== undefined && updated.previous_services !== canAccessServices) ||
            (canAccessPolicies !== undefined && updated.previous_policies !== canAccessPolicies) ||
            (canAccessCategories !== undefined && updated.previous_categories !== canAccessCategories)
          ) changes.push("Changed permissions");
          return changes.length
            ? `${changes.join("; ")} for user: ${updated.username}`
            : `Updated user account: ${updated.username}`;
        })
      : await userModel.updateUser(fields);
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

  if (user && Object.hasOwn(user, "previous_id")) {
    const {
      previous_id: _previousId, previous_role: _previousRole,
      previous_active: _previousActive, previous_services: _previousServices,
      previous_policies: _previousPolicies, previous_categories: _previousCategories,
      ...result
    } = user;
    user = result;
  }
  return formatUserAvatar(user);
};
