import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

vi.mock("../../src/models/userModel.js", () => ({
  insertUser: vi.fn(),
  updateUser: vi.fn(),
}));

import * as userModel from "../../src/models/userModel.js";
import { createUser, updateUser } from "../../src/services/userService.js";

describe("userService password handling", () => {
  beforeEach(() => {
    userModel.insertUser.mockReset();
    userModel.updateUser.mockReset();
  });

  it("hashes a new user's password before insertion", async () => {
    userModel.insertUser.mockResolvedValueOnce({ id: 1 });

    await createUser({
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      password: "password123",
      role: "staff",
    });

    const insertedUser = userModel.insertUser.mock.calls[0][0];
    expect(insertedUser.passwordHash).not.toBe("password123");
    expect(await bcrypt.compare("password123", insertedUser.passwordHash)).toBe(
      true,
    );
  });

  it("hashes an updated password and leaves it unset when not provided", async () => {
    userModel.updateUser.mockResolvedValueOnce({ id: 1 });

    await updateUser({ userId: 1, password: "new-password123" });

    const updatedUser = userModel.updateUser.mock.calls[0][0];
    expect(updatedUser.passwordHash).not.toBe("new-password123");
    expect(
      await bcrypt.compare("new-password123", updatedUser.passwordHash),
    ).toBe(true);

    userModel.updateUser.mockResolvedValueOnce({ id: 1 });
    await updateUser({ userId: 1, firstName: "Updated" });

    expect(userModel.updateUser.mock.calls[1][0]).toMatchObject({
      userId: 1,
      firstName: "Updated",
      passwordHash: undefined,
    });
  });
});
