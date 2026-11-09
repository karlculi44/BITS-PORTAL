// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { ThemeProvider } from "../context/ThemeProvider";
import { getUsers, updateUser } from "../services/userService";
import Users from "../pages/Users";
import Topbar from "./Topbar";

vi.mock("../services/userService", () => ({
  getUsers: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const user = {
  id: 1,
  username: "admin",
  first_name: "Alice",
  last_name: "Admin",
  role: "admin",
  is_active: true,
};

function renderTopbar(initialUser, showUsers = false) {
  function App() {
    const [currentUser, setCurrentUser] = useState(initialUser);
    return (
      <AuthContext.Provider value={{ user: currentUser, updateUser: setCurrentUser }}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/users"]}>
            <Topbar onMenuClick={vi.fn()} />
            {showUsers && <Users />}
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  }
  return render(<App />);
}

beforeEach(() => {
  getUsers.mockResolvedValue([user]);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Topbar profile picture", () => {
  it("displays the signed-in user's image", () => {
    const { container } = renderTopbar({
      ...user,
      profile_image: "/api/users/images/avatar.png",
    });

    const image = container.querySelector("header img");
    expect(image.getAttribute("src")).toBe(
      `${window.location.origin}/api/users/images/avatar.png`,
    );
    expect(image.getAttribute("alt")).toBe("");
    expect(container.querySelector("header .lucide-user")).toBeNull();
    expect(screen.getByText("Alice Admin")).toBeTruthy();
  });

  it("uses the icon when there is no image or the image fails", () => {
    const { container, unmount } = renderTopbar(user);
    expect(container.querySelector("header .lucide-user")).toBeTruthy();
    unmount();

    const rendered = renderTopbar({ ...user, profile_image: "/missing.png" });
    fireEvent.error(rendered.container.querySelector("header img"));
    expect(rendered.container.querySelector("header img")).toBeNull();
    expect(rendered.container.querySelector("header .lucide-user")).toBeTruthy();
  });

  it("does not display an avatar when signed out", () => {
    const { container } = renderTopbar(null);
    expect(container.querySelector("header img")).toBeNull();
    expect(container.querySelector("header .lucide-user")).toBeNull();
  });

  it("updates the navbar after the signed-in user changes their picture", async () => {
    const updatedUser = { ...user, profile_image: "/api/users/images/new.png" };
    updateUser.mockResolvedValue({ data: updatedUser });
    class TestURL extends URL {
      static createObjectURL = vi.fn(() => "blob:preview");
      static revokeObjectURL = vi.fn();
    }
    vi.stubGlobal("URL", TestURL);

    const { container } = renderTopbar(user, true);
    fireEvent.click(await screen.findByRole("button", { name: "Edit admin" }));
    fireEvent.change(screen.getByLabelText("Profile Picture"), {
      target: { files: [new File(["image"], "avatar.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(container.querySelector("header img")?.getAttribute("src")).toBe(
        `${window.location.origin}/api/users/images/new.png`,
      );
    });
    expect(updateUser).toHaveBeenCalledOnce();
    const [userId, payload] = updateUser.mock.calls[0];
    expect(userId).toBe(user.id);
    expect(payload.get("image").name).toBe("avatar.png");
  });
});
