// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CategoryModal from "./CategoryModal";
import UserModal from "./UserModal";
import { createCategory, updateCategory } from "../services/categoryService";
import { createUser, updateUser } from "../services/userService";

vi.mock("../services/categoryService", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));
vi.mock("../services/userService", () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("admin modal forms", () => {
  it.each([false, true])("validates and saves a category (editing: %s)", async (editing) => {
    const category = editing ? { id: 7, name: "Original" } : null;
    const onSaved = vi.fn();
    createCategory.mockResolvedValue({});
    updateCategory.mockResolvedValue({});
    render(<CategoryModal category={category} type="service" onClose={vi.fn()} onSaved={onSaved} />);
    const name = screen.getByLabelText("Category Name");
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: editing ? "Save Changes" : "Add Category" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Category name is required.");
    fireEvent.change(name, { target: { value: " Updated " } });
    fireEvent.click(screen.getByRole("button", { name: editing ? "Save Changes" : "Add Category" }));
    await waitFor(() => {
      if (editing) expect(updateCategory).toHaveBeenCalledWith(7, { name: "Updated" });
      else expect(createCategory).toHaveBeenCalledWith({ name: "Updated", type: "service" });
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it.each([false, true])("validates and saves a user (editing: %s)", async (editing) => {
    const user = editing ? { id: 4, first_name: "Old", last_name: "Name", username: "olduser", role: "staff" } : null;
    const onSaved = vi.fn();
    createUser.mockResolvedValue({});
    updateUser.mockResolvedValue({ data: { id: 4 } });
    render(<UserModal user={user} onClose={vi.fn()} onSaved={onSaved} />);
    const username = screen.getByLabelText("Username");
    fireEvent.change(username, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: editing ? "Save Changes" : "Create Account" }));
    expect(await screen.findByText("Username must be at least 3 characters.")).toBeTruthy();
    fireEvent.change(username, { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "New Name" } });
    if (!editing) fireEvent.change(screen.getByLabelText("Account Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: editing ? "Save Changes" : "Create Account" }));
    await waitFor(() => expect(editing ? updateUser : createUser).toHaveBeenCalledTimes(1));
    const args = (editing ? updateUser : createUser).mock.calls[0];
    if (editing) expect(args[0]).toBe(4);
    const payload = args[editing ? 1 : 0];
    expect(payload.get("username")).toBe("newuser");
    expect(payload.get("firstName")).toBe("New");
    expect(payload.get("lastName")).toBe("Name");
    if (!editing) expect(payload.get("password")).toBe("password123");
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
