import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(8, "Password is required"),
});
