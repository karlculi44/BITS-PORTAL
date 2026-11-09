// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./api";
import { getAuditLogs } from "./auditLogService";

vi.mock("./api", () => ({ default: { get: vi.fn() } }));

beforeEach(() => {
  api.get.mockReset();
});

describe("audit log service", () => {
  it("sends a local calendar day as UTC bounds and forwards other filters", async () => {
    api.get.mockResolvedValue({ data: { logs: [], summary: { modules: [] } } });
    const signal = new AbortController().signal;
    await getAuditLogs({ module: "Auth", action: "Login", username: " User ", date: "2026-03-08" }, signal);
    expect(api.get).toHaveBeenCalledWith("/audit-logs", {
      signal,
      params: {
        module: "Auth",
        action: "Login",
        username: "User",
        start: new Date(2026, 2, 8).toISOString(),
        end: new Date(2026, 2, 9).toISOString(),
      },
    });
  });

  it("rejects malformed responses", async () => {
    api.get.mockResolvedValue({ data: { logs: [], summary: {} } });
    await expect(getAuditLogs({ module: "", action: "", username: "", date: "" }))
      .rejects.toThrow("Invalid audit logs response");
  });
});
