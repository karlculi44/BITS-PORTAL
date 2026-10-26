import bcrypt from "bcrypt";
import * as userModel from "../models/userModel.js";

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
