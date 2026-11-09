// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import AuditLogsTable from "./AuditLogsTable";
import { auditLogExamples } from "../data/auditLogExamples";

afterEach(cleanup);

describe("AuditLogsTable", () => {
  it("renders numbered examples, all columns, action colors, and missing IPs", () => {
    render(<AuditLogsTable logs={auditLogExamples} />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "#", "Timestamp", "User", "Action", "Module", "Details", "IP Address",
    ]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => row.cells[0].textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(within(rows[0]).getByText("Login").className).toContain("bg-emerald-100");
    expect(within(rows[1]).getByText("Edit").className).toContain("bg-amber-100");
    expect(within(rows[2]).getByText("Add").className).toContain("bg-blue-100");
    expect(within(rows[3]).getByText("Delete").className).toContain("bg-red-100");
    expect(within(rows[4]).getByText("Logout").className).toContain("bg-slate-100");
    expect(within(rows[5]).getByText("Login Failed").className).toContain("bg-red-100");
    expect(rows[5].cells[6].textContent).toBe("—");
    expect(rows[0].querySelector("time").getAttribute("datetime")).toBe(auditLogExamples[0].timestamp);
    expect(rows[0].querySelector("time").children).toHaveLength(2);
  });

  it("uses a profile image and falls back to the first initial if it fails", () => {
    const log = {
      ...auditLogExamples[0],
      user: { username: "test.user", first_name: "Taylor", profile_image: "/uploads/avatar.png" },
    };
    const { container } = render(<AuditLogsTable logs={[log]} />);
    const image = container.querySelector("img");
    expect(image.getAttribute("src")).toContain("/uploads/avatar.png");
    fireEvent.error(image);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("shows failed-login avatars for matched users and initials for unknown usernames", () => {
    const logs = [
      {
        ...auditLogExamples[0], action: "Login Failed",
        user: { username: "known", first_name: "Known", profile_image: "/api/users/images/avatar.png" },
      },
      {
        ...auditLogExamples[1], action: "Login Failed",
        user: { username: "unknown", first_name: null, profile_image: null },
      },
    ];
    render(<AuditLogsTable logs={logs} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].querySelector("img").getAttribute("src")).toContain("/api/users/images/avatar.png");
    expect(rows[1].querySelector("img")).toBeNull();
    expect(within(rows[1]).getByText("U")).toBeTruthy();
  });

  it("keeps long details in a scrollable table and handles an empty list", () => {
    const details = "A".repeat(300);
    const { rerender } = render(<AuditLogsTable logs={[{ ...auditLogExamples[0], details }]} />);
    expect(screen.getByText(details).className).toContain("wrap-break-word");
    expect(screen.getByRole("region", { name: "Audit logs table" }).className).toContain("overflow-x-auto");
    expect(screen.getByRole("table").style.minWidth).toBe("64rem");
    rerender(<AuditLogsTable logs={[]} />);
    expect(screen.getByText("No audit logs available.")).toBeTruthy();
  });
});
