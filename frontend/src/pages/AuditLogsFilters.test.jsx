// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AuditLogs from "./AuditLogs";
import { auditLogExamples } from "../data/auditLogExamples";
import { getAuditLogs } from "../services/auditLogService";

vi.mock("../services/auditLogService", () => ({ getAuditLogs: vi.fn() }));

vi.mock("../data/auditLogExamples", () => ({
  auditLogExamples: [
    { id: 1, timestamp: new Date(2026, 0, 1, 0, 30).toISOString(), user: { username: "Karl" }, action: "Login", module: "Auth", details: "First login" },
    { id: 2, timestamp: new Date(2026, 0, 1, 12).toISOString(), user: { username: "kculi" }, action: "Edit", module: "Categories", details: "Category edit" },
    { id: 3, timestamp: new Date(2026, 0, 1, 13).toISOString(), user: { username: "KCuLi" }, action: "Edit", module: "Users", details: "User edit" },
    { id: 4, timestamp: new Date(2026, 0, 2, 0, 30).toISOString(), user: { username: "kculi" }, action: "Edit", module: "Categories", details: "Next day edit" },
    { id: 5, timestamp: new Date(2026, 0, 1, 14).toISOString(), user: { username: "sam" }, action: "Add", module: "Services", details: "Service added" },
    { id: 6, timestamp: new Date(2026, 0, 1, 15).toISOString(), user: { username: "sam" }, action: "Login Failed", module: "Auth", details: "Failed login" },
    { id: 7, timestamp: new Date(2026, 0, 1, 16).toISOString(), user: { username: "sam" }, action: "Logout", module: "Auth", details: "Signed out" },
  ],
}));

afterEach(cleanup);

beforeEach(() => {
  getAuditLogs.mockImplementation(async (filters) => ({
    logs: auditLogExamples.filter((log) => {
      const date = new Date(log.timestamp);
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return (!filters.module || log.module === filters.module) &&
        (!filters.action || log.action === filters.action) &&
        (!filters.username || log.user.username.toLowerCase().includes(filters.username.trim().toLowerCase())) &&
        (!filters.date || localDate === filters.date);
    }),
    summary: { total: 7, login: 1, edit: 3, add: 1, login_failed: 1, modules: ["Auth", "Categories", "Services", "Users"] },
  }));
});

function expectCounts() {
  [
    ["Total Entries", "7"],
    ["Login", "1"],
    ["Edit", "3"],
    ["Add", "1"],
    ["Login Failed", "1"],
  ].forEach(([label, count]) => {
    const card = screen.getByText(label, { selector: "p" }).parentElement;
    expect(within(card).getByText(count)).toBeTruthy();
  });
}

function apply() {
  fireEvent.click(screen.getByRole("button", { name: "Filter" }));
}

describe("Audit Logs filters and summary", () => {
  it("counts each action across the complete dataset and keeps totals when filtering", async () => {
    render(<AuditLogs />);
    await screen.findByText("First login");
    expectCounts();
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "Login Failed" } });
    apply();
    await screen.findByText("Failed login");
    expect(screen.getByText("Failed login")).toBeTruthy();
    expect(screen.queryByText("First login")).toBeNull();
    expectCounts();
  });

  it("applies module and action filters together only on submission", async () => {
    render(<AuditLogs />);
    await screen.findByText("First login");
    fireEvent.change(screen.getByLabelText("Module"), { target: { value: "Categories" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "Edit" } });
    expect(screen.getByText("First login")).toBeTruthy();
    apply();
    await screen.findByText("Category edit");
    expect(screen.getByText("Category edit")).toBeTruthy();
    expect(screen.getByText("Next day edit")).toBeTruthy();
    expect(screen.queryByText("User edit")).toBeNull();
    expect(screen.queryByText("First login")).toBeNull();
    expect(screen.getByLabelText("Module").value).toBe("Categories");
    expect(screen.getByLabelText("Action").value).toBe("Edit");
    expectCounts();
  });

  it("matches usernames case-insensitively and combines all four filters", async () => {
    const original = JSON.stringify(auditLogExamples);
    render(<AuditLogs />);
    await screen.findByText("First login");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "CuL" } });
    apply();
    await screen.findByText("User edit");
    expect(screen.getByText("Category edit")).toBeTruthy();
    expect(screen.getByText("User edit")).toBeTruthy();
    expect(screen.queryByText("First login")).toBeNull();
    fireEvent.change(screen.getByLabelText("Module"), { target: { value: "Categories" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "Edit" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-01-01" } });
    apply();
    await screen.findByText("Category edit");
    expect(screen.getByText("Category edit")).toBeTruthy();
    expect(screen.queryByText("User edit")).toBeNull();
    expect(screen.queryByText("Next day edit")).toBeNull();
    expect(JSON.stringify(auditLogExamples)).toBe(original);
  });

  it("filters by local calendar day at midnight, not the timestamp's UTC date", async () => {
    render(<AuditLogs />);
    await screen.findByText("First login");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-01-01" } });
    apply();
    await screen.findByText("First login");
    expect(screen.getByText("First login")).toBeTruthy();
    expect(screen.queryByText("Next day edit")).toBeNull();
  });

  it("shows an empty result and clears both pending and applied filters", async () => {
    render(<AuditLogs />);
    await screen.findByText("First login");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "not-found" } });
    apply();
    expect(await screen.findByText("No audit logs match the selected filters.")).toBeTruthy();
    expectCounts();
    fireEvent.change(screen.getByLabelText("Module"), { target: { value: "Auth" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "Login" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await screen.findByText("First login");
    ["Module", "Action", "Username", "Date"].forEach((label) => {
      expect(screen.getByLabelText(label).value).toBe("");
    });
    expect(screen.getByText("First login")).toBeTruthy();
    expect(screen.getByText("Next day edit")).toBeTruthy();
    expectCounts();
  });

  it("offers dataset modules and the supported actions", async () => {
    render(<AuditLogs />);
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalled());
    await screen.findByText("First login");
    expect(within(screen.getByLabelText("Module")).getAllByRole("option").map((option) => option.value)).toEqual([
      "", "Auth", "Categories", "Services", "Users",
    ]);
    expect(within(screen.getByLabelText("Action")).getAllByRole("option").map((option) => option.value)).toEqual([
      "", "Login", "Logout", "Login Failed", "Add", "Edit", "Delete",
    ]);
  });

  it("reports retrieval errors and permits retrying", async () => {
    getAuditLogs.mockRejectedValueOnce(new Error("network failure"));
    render(<AuditLogs />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Unable to load audit logs.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("First login")).toBeTruthy();
    expectCounts();
  });
});
