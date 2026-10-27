import { z } from "zod";

export const createPolicySchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().nullable().optional(),
  file: z.string().min(1, "File is required"),
  category_id: z
    .number()
    .int("Category ID must be an integer")
    .min(1, "Category ID must be a positive integer")
    .max(2147483647, "Category ID is invalid"),
});
