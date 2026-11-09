import { z } from "zod";

export const createServiceSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  url: z.url("A valid URL is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().nullable().optional(),
  sort_order: z
    .number()
    .int("Sort order must be an integer")
    .min(-2147483648)
    .max(2147483647)
    .optional(),
  category_id: z
    .number()
    .int("Category ID must be an integer")
    .min(1, "Category ID must be a positive integer")
    .max(2147483647, "Category ID is invalid"),
});

export const updateServiceSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title is too long")
      .optional(),
    url: z.url("A valid URL is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    image: z.string().nullable().optional(),
    sort_order: z
      .number()
      .int("Sort order must be an integer")
      .min(-2147483648)
      .max(2147483647)
      .optional(),
    category_id: z
      .number()
      .int("Category ID must be an integer")
      .min(1, "Category ID must be a positive integer")
      .max(2147483647, "Category ID is invalid")
      .optional(),
  })
  .strict()
  .refine(
    (service) => Object.values(service).some((value) => value !== undefined),
    {
      message: "At least one field must be provided",
    },
  );
