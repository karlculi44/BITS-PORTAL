import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { testPool, verifyTestDatabase } from "../helpers/testDatabase.js";
import { getAuditLogs, getAuditSummary } from "../../src/models/auditLogModel.js";
import pool from "../../src/config/db.js";

beforeAll(verifyTestDatabase);
afterAll(async () => {
  await testPool.end();
  await pool.end();
});

describe("audit log queries", () => {
  it("uses AND filters, literal username matching, date bounds, and unfiltered totals", async () => {
    const client = await testPool.connect();
    const module = `test_${randomUUID()}`;
    try {
      await client.query("BEGIN");
      const before = await getAuditSummary(client);
      await client.query(
        `INSERT INTO logs (username, action, module, details, ip_address, created_at)
         VALUES ($1, 'Login', $2, 'test', '192.0.2.1', '2026-03-16T00:00:00Z'),
                ($3, 'Login Failed', $2, 'test', NULL, '2026-03-16T12:00:00Z'),
                ($1, 'Login', $2, 'test', NULL, '2026-03-17T00:00:00Z')`,
        ["AudIt_Test", module, "other"],
      );
      const rows = await getAuditLogs({
        module, action: "Login", username: "it_te",
        start: "2026-03-16T00:00:00Z", end: "2026-03-17T00:00:00Z",
      }, client);
      expect(rows).toHaveLength(1);
      expect(rows[0].username).toBe("AudIt_Test");
      expect(rows[0].ip_address).toBe("192.0.2.1");
      const literal = await getAuditLogs({ module, username: "%" }, client);
      expect(literal).toHaveLength(0);
      const after = await getAuditSummary(client);
      expect(after.total).toBe(before.total + 3);
      expect(after.login).toBe(before.login + 2);
      expect(after.login_failed).toBe(before.login_failed + 1);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
