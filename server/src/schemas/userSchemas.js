import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(8, "Username is required"),
  password: z.string().min(8, "Password is required"),
  role: z.enum(["admin", "staff"], "Role must be either 'admin' or 'staff'"),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    username: z.string().min(8, "Username is required").optional(),
    password: z.string().min(8, "Password is required").optional(),
    role: z
      .enum(["admin", "staff"], "Role must be either 'admin' or 'staff'")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((user) => Object.values(user).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
