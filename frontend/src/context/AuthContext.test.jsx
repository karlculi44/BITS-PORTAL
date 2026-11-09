// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeProvider";
import { useAuth } from "../hooks/useAuth";
import { getAccessToken } from "../services/api";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import * as authService from "../services/authService";
import * as dashboardService from "../services/dashboardService";

vi.mock("../services/dashboardService", () => ({
  getDashboardData: vi.fn(),
  getRecentServices: vi.fn(),
}));
vi.mock("../services/authService", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  refresh: vi.fn(),
  googleLogin: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const user = { id: 1, first_name: "Test", username: "testuser", role: "staff" };

function Status() {
  const { user: currentUser, loading } = useAuth();
  const location = useLocation();
  return (
    <div>
      <span data-testid="status">
        {loading
          ? "loading"
          : currentUser
            ? currentUser.first_name
            : "signed out"}
      </span>
      <span data-testid="location">{location.pathname}</span>
    </div>
  );
}

function renderApp(path = "/login") {
  return render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Status />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  authService.refresh.mockRejectedValue({ response: { status: 401 } });
  dashboardService.getDashboardData.mockResolvedValue({
    stats: {
      total_users: 0,
      total_policies: 0,
      total_categories: 0,
    },
    servicesByCategory: [],
    policiesByCategory: [],
  });
  dashboardService.getRecentServices.mockResolvedValue([]);
});
afterEach(cleanup);

describe("AuthProvider", () => {
  it("logs in and exposes the user", async () => {
    authService.login.mockResolvedValue({
      message: "Login successful",
      data: user,
      accessToken: "login-token",
    });
    renderApp();
    await screen.findByText("signed out");
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: " testuser " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByText("Welcome, Test");
    expect(authService.login).toHaveBeenCalledWith({
      username: "testuser",
      password: "password",
    });
    expect(toast.success).toHaveBeenCalledWith("Login successful");
    expect(screen.getByTestId("status").textContent).toBe("Test");
    expect(getAccessToken()).toBe("login-token");
  });

  it("restores a session on load", async () => {
    authService.refresh.mockResolvedValue({
      data: user,
      accessToken: "restored-token",
    });
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    const totalUsers = await screen.findByText("Total Users");
    const servicesChart = screen.getByRole("heading", {
      name: "Services by Category",
    });
    expect(
      totalUsers.compareDocumentPosition(servicesChart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(getAccessToken()).toBe("restored-token");
  });

  it("redirects unauthenticated users to login", async () => {
    renderApp("/dashboard");
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/login"),
    );
  });

  it.each([
    ["testuser", "wrong"],
    ["ab", "password123"],
  ])("shows invalid credentials without authenticating", async (username, password) => {
    authService.login.mockRejectedValue({
      response: { status: 401, data: { message: "Invalid credentials." } },
    });
    renderApp();
    await screen.findByText("signed out");
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: username },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: password },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toBe(
      "Invalid credentials.",
    );
    expect(screen.getByTestId("status").textContent).toBe("signed out");
    expect(authService.login).toHaveBeenCalledWith({ username, password });
  });

  it.each([
    ["", "", "Username and password are required."],
    ["", "password", "Username is required"],
    ["testuser", "", "Password is required"],
    [" ", "password", "Username is required"],
    ["testuser", " ", "Password is required"],
  ])("shows required messages for empty login fields", async (username, password, message) => {
    renderApp();
    await screen.findByText("signed out");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: username } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("logs out and redirects to login", async () => {
    authService.refresh.mockResolvedValue({
      data: user,
      accessToken: "session-token",
    });
    authService.logout.mockResolvedValue({ message: "Logout successful" });
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/login"),
    );
    expect(screen.getByTestId("status").textContent).toBe("signed out");
    expect(getAccessToken()).toBeNull();
  });

  it("keeps the user signed in if logout fails", async () => {
    authService.refresh.mockResolvedValue({
      data: user,
      accessToken: "session-token",
    });
    authService.logout.mockRejectedValue(new Error("network error"));
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Unable to log out. Please try again.",
      ),
    );
    expect(screen.getByTestId("location").textContent).toBe("/dashboard");
    expect(screen.getByTestId("status").textContent).toBe("Test");
  });
});
