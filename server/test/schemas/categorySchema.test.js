import { describe, expect, it } from "vitest";
import { createCategorySchema } from "../../src/schemas/categorySchema.js";

describe("createCategorySchema", () => {
  it("requires a category name, description, and valid type", () => {
    expect(
      createCategorySchema.safeParse({
        name: "Books",
        type: "service",
      }).success,
    ).toBe(false);

    expect(
      createCategorySchema.safeParse({
        name: "Books",
        description: "Reading materials",
        type: "service",
      }).success,
    ).toBe(true);
  });
});
