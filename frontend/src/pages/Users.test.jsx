// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AuthContext } from "../context/authContextValue";
import { getUsers, updateUser } from "../services/userService";
import toast from "react-hot-toast";
import Users from "./Users";

vi.mock("../services/userService", () => ({
  getUsers: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../components/UserModal", () => ({
  default: ({ user, onClose }) => (
    <div role="dialog">
      {user ? `Edit ${user.username}` : "Add User"}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const users = [
  { id: 1, username: "admin", first_name: "Alice", last_name: "Admin", role: "admin", is_active: true },
  { id: 2, username: "bsmith", first_name: "Bob", last_name: "Smith", role: "staff", is_active: false },
];

function renderUsers() {
  return render(
    <AuthContext.Provider value={{ user: users[0] }}>
      <Users />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  getUsers.mockResolvedValue(users);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("Users page views", () => {
  it("preserves search and records when switching between list and grid", async () => {
    renderUsers();
    await screen.findByText("bsmith");
    const listButton = screen.getByRole("button", { name: "List View" });
    const gridButton = screen.getByRole("button", { name: "Grid View" });
    expect(listButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("table")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "  BOB " } });
    fireEvent.click(gridButton);
    expect(gridButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "bsmith" })).toBeTruthy();
    expect(screen.getByText("Bob Smith")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(screen.getByLabelText("Search users").value).toBe("  BOB ");
    expect(screen.queryByText("admin")).toBeNull();

    fireEvent.click(listButton);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("bsmith")).toBeTruthy();
    expect(screen.queryByText("admin")).toBeNull();
  });

  it("retains user details and actions in grid view", async () => {
    updateUser.mockResolvedValue({ data: { is_active: true } });
    renderUsers();
    await screen.findByText("bsmith");
    fireEvent.click(screen.getByRole("button", { name: "Grid View" }));

    const adminCard = screen.getByRole("heading", { name: "admin" }).closest("li");
    expect(within(adminCard).getByText("Alice Admin")).toBeTruthy();
    expect(within(adminCard).getByText("ALL ACCESS")).toBeTruthy();
    expect(within(adminCard).getByRole("button", { name: "Deactivate admin" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Edit bsmith" }));
    expect(screen.getByRole("dialog").textContent).toContain("Edit bsmith");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Activate bsmith" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Activate User" })).getByRole("button", { name: "Activate User" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(2, { isActive: true }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Activate User" })).toBeNull());
    expect(await screen.findByRole("button", { name: "Deactivate bsmith" })).toBeTruthy();
    expect(screen.queryByText("Inactive")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByRole("button", { name: "Deactivate bsmith" })).toBeTruthy();
  });

  it("confirms deactivation, blocks repeated submissions, and reports errors", async () => {
    getUsers.mockResolvedValue([users[0], { ...users[1], is_active: true }]);
    let rejectUpdate;
    updateUser.mockReturnValue(new Promise((_, reject) => { rejectUpdate = reject; }));
    renderUsers();
    fireEvent.click(await screen.findByRole("button", { name: "Deactivate bsmith" }));
    const dialog = screen.getByRole("dialog", { name: "Deactivate User" });
    expect(dialog.textContent).toContain('Deactivate user "bsmith"?');
    const confirm = within(dialog).getByRole("button", { name: "Deactivate User" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(2, { isActive: false });
    expect(within(dialog).getByRole("button", { name: "Cancel" }).disabled).toBe(true);
    rejectUpdate({ response: { data: { message: "Cannot update user" } } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Cannot update user"));
    expect(within(dialog).getByRole("button", { name: "Deactivate User" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Deactivate bsmith" })).toBeTruthy();
  });

  it("shows the search empty state in either view", async () => {
    renderUsers();
    await screen.findByText("bsmith");
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
    expect(screen.getByText("No users match your search.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByText("No users match your search.")).toBeTruthy();
  });
});
