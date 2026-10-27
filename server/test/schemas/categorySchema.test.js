import { describe, expect, it } from "vitest";
import { createCategorySchema } from "../../src/schemas/categorySchema.js";

describe("createCategorySchema", () => {
  it("requires a category name and valid type", () => {
    expect(
      createCategorySchema.safeParse({
        name: "Books",
        type: "service",
      }).success,
    ).toBe(true);

    expect(
      createCategorySchema.safeParse({
        name: "",
        type: "service",
      }).success,
    ).toBe(false);

    expect(
      createCategorySchema.safeParse({
        name: "Books",
        type: "other",
      }).success,
    ).toBe(false);
  });
});
