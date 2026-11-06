import { z } from "zod";

const extraFields = {
  image: z.string().optional(),
  canAccessServices: z.boolean().optional(),
  canAccessPolicies: z.boolean().optional(),
  canAccessCategories: z.boolean().optional(),
};

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password is required"),
  role: z.enum(["admin", "staff"], "Role must be either 'admin' or 'staff'"),
  ...extraFields,
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .optional(),
    password: z.string().min(8, "Password is required").optional(),
    role: z
      .enum(["admin", "staff"], "Role must be either 'admin' or 'staff'")
      .optional(),
    isActive: z.boolean().optional(),
    ...extraFields,
  })
  .strict()
  .refine((user) => Object.values(user).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
