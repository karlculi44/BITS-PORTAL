import { createUser } from "../services/userService.js";

export async function createUserController(req, res, next) {
  try {
    const user = await createUser(req.body);

    res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
