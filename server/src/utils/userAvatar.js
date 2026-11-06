import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const userAvatarDirectory = path.join(
  serverDirectory,
  "uploads",
  "users",
);

const userAvatarFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpe?g|webp)$/i;

export const isManagedUserAvatar = (filename) =>
  typeof filename === "string" && userAvatarFilenamePattern.test(filename);

export const getUserAvatarPath = (filename) =>
  isManagedUserAvatar(filename)
    ? path.join(userAvatarDirectory, filename)
    : undefined;

export const removeUserAvatar = async (filename) => {
  const filePath = getUserAvatarPath(filename);

  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

export const formatUserAvatar = (user) => {
  if (!user || !isManagedUserAvatar(user.profile_image)) return user;

  return {
    ...user,
    profile_image: `/api/users/images/${user.profile_image}`,
  };
};

export const formatUserAvatars = (users) => users.map(formatUserAvatar);
