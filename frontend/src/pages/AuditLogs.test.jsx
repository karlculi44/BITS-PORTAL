// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";
import { AuthContext } from "../context/authContextValue";

vi.mock("../components/NetworkBackground", () => ({ default: () => null }));
vi.mock("../components/ScrollProgress", () => ({ default: () => null }));
vi.mock("./Dashboard", () => ({ default: () => <div>Dashboard content</div> }));
vi.mock("../services/auditLogService", () => ({
  getAuditLogs: vi.fn().mockResolvedValue({
    logs: [],
    summary: { total: 0, login: 0, edit: 0, add: 0, login_failed: 0, modules: [] },
  }),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
});

function renderApp(role) {
  return render(
    <AuthContext.Provider value={{
      user: { username: "test", first_name: "Test", role },
      loading: false,
      logout: vi.fn(),
    }}>
      <App />
    </AuthContext.Provider>,
  );
}

describe("Audit Logs route", () => {
  it("opens from the admin sidebar", async () => {
    window.history.replaceState({}, "", "/dashboard");
    renderApp("admin");
    fireEvent.click(screen.getByRole("link", { name: "Activity Logs" }));
    expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeTruthy();
    const link = screen.getByRole("link", { name: "Activity Logs" });
    expect(link.getAttribute("href")).toBe("/activity-logs");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("table")).toBeTruthy();
  });

  it("keeps the page restricted to admins", () => {
    window.history.replaceState({}, "", "/activity-logs");
    renderApp("staff");
    expect(screen.getByText("The Unauthorized page has not been built yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
