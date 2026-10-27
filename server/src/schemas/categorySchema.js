import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["service", "policy"]),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1, "Category name is required").optional(),
    type: z.enum(["service", "policy"]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (category) => Object.values(category).some((value) => value !== undefined),
    {
      message: "At least one field must be provided",
    },
  );
