import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().refine((value) => value.trim().length > 0, "Username is required"),
  password: z.string().refine((value) => value.trim().length > 0, "Password is required"),
});
