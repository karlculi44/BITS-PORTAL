import * as auditLogModel from "../models/auditLogModel.js";
import { formatUserAvatar } from "../utils/userAvatar.js";
import pool from "../config/db.js";
import { isIP } from "node:net";

export const requestAuditContext = (req) => ({
  userId: req.user?.sub ?? null,
  ipAddress: isIP(req.ip) ? req.ip : null,
});

export const recordAuditEvent = (event, db = pool) =>
  auditLogModel.insertAuditLog(event, db);

export const withTransaction = async (operation) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const withAuditTransaction = (context, action, module, operation, describe) =>
  withTransaction(async (client) => {
    const actor = await client.query("SELECT username FROM users WHERE id = $1", [context.userId]);
    if (!actor.rows[0]) throw new Error("Audit actor no longer exists");
    const result = await operation(client);
    const details = result && describe(result);
    if (details) {
      await recordAuditEvent({
        ...context, username: actor.rows[0].username, action, module,
        details,
      }, client);
    }
    return result;
  });

export const getAuditLogs = async (filters) => {
  const [rows, summary] = await Promise.all([
    auditLogModel.getAuditLogs(filters),
    auditLogModel.getAuditSummary(),
  ]);
  return {
    logs: rows.map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      user: {
        username: row.username || "Unknown user",
        first_name: row.first_name,
        profile_image: formatUserAvatar({ profile_image: row.profile_image }).profile_image,
      },
      action: row.action,
      module: row.module,
      details: row.details,
      ipAddress: row.ip_address,
    })),
    summary,
  };
};
