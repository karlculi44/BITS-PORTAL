// @vitest-environment jsdom
/* eslint-disable no-unused-vars -- Core ESLint does not recognize JSX references. */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AdminLayout from "../layouts/AdminLayout";
import * as authService from "../services/authService";
import * as dashboardService from "../services/dashboardService";

vi.mock("../services/dashboardService", () => ({
  getDashboardData: vi.fn(),
}));
vi.mock("../services/authService", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const user = { id: 1, first_name: "Test", username: "testuser", role: "staff" };

function Status() {
  const { user: currentUser, loading, isAuthenticated, checkAuth } = useAuth();
  const location = useLocation();
  return (
    <div>
      <span data-testid="status">{loading ? "loading" : isAuthenticated ? currentUser.first_name : "signed out"}</span>
      <span data-testid="location">{location.pathname}</span>
      <button onClick={() => checkAuth()}>Check session</button>
      <Link to="/other">Other page</Link>
    </div>
  );
}

function renderApp(path = "/login") {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Status />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route path="/other" element={<div>Other</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  authService.getSession.mockRejectedValue({ response: { status: 401 } });
  dashboardService.getDashboardData.mockResolvedValue({
    stats: { total_users: 0, active_users: 0, total_services: 0, total_policies: 0, total_categories: 0 },
    recentUsers: [],
    recentServices: [],
  });
});
afterEach(cleanup);

describe("AuthProvider", () => {
  it("logs in and exposes the user across pages without rechecking", async () => {
    authService.login.mockResolvedValue({ message: "Login successful", data: user });
    authService.logout.mockResolvedValue({ message: "Logout successful" });
    renderApp();
    await screen.findByText("signed out");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: " testuser " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByText("Welcome, Test");
    expect(authService.login).toHaveBeenCalledWith("testuser", "password");
    expect(toast.success).toHaveBeenCalledWith("Login successful");
    expect(screen.getByTestId("status").textContent).toBe("Test");
    fireEvent.click(screen.getByText("Other page"));
    expect(screen.getByTestId("status").textContent).toBe("Test");
    expect(authService.getSession).toHaveBeenCalledTimes(1);
  });

  it("restores a session and clears it after an invalid session check", async () => {
    authService.getSession.mockResolvedValueOnce({ data: user });
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    expect(authService.getSession).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Check session"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("signed out"));
  });

  it("restores the authenticated user after the app is remounted", async () => {
    authService.getSession.mockResolvedValue({ data: user });
    const app = renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    app.unmount();
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    expect(authService.getSession).toHaveBeenCalledTimes(2);
  });

  it("surfaces session-check errors rather than treating them as valid sessions", async () => {
    authService.getSession.mockRejectedValue(new Error("network error"));
    renderApp();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Unable to check your session. Please try again."));
    expect(screen.getByTestId("status").textContent).toBe("signed out");
  });

  it("shows login errors without authenticating", async () => {
    authService.login.mockRejectedValue({ response: { data: { message: "Invalid username or password" } } });
    renderApp();
    await screen.findByText("signed out");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toBe("Invalid username or password");
    expect(screen.getByTestId("status").textContent).toBe("signed out");
    expect(screen.getByTestId("location").textContent).toBe("/login");
  });

  it("logs out and redirects to login", async () => {
    authService.getSession.mockResolvedValueOnce({ data: user });
    authService.logout.mockResolvedValue({ message: "Logout successful" });
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/login"));
    expect(screen.getByTestId("status").textContent).toBe("signed out");
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it("keeps the user signed in if logout fails", async () => {
    authService.getSession.mockResolvedValueOnce({ data: user });
    authService.logout.mockRejectedValue(new Error("network error"));
    renderApp("/dashboard");
    await screen.findByText("Welcome, Test");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(authService.logout).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("location").textContent).toBe("/dashboard");
    expect(screen.getByTestId("status").textContent).toBe("Test");
  });

  it("does not let an older session check overwrite a successful login", async () => {
    let rejectSession;
    authService.getSession.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSession = reject; }));
    authService.login.mockResolvedValue({ data: user });
    renderApp();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByText("Welcome, Test");
    rejectSession({ response: { status: 401 } });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("Test"));
  });
});
