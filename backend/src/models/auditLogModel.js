import pool from "../config/db.js";

export const insertAuditLog = async ({ userId, username, action, module, details, ipAddress }, db = pool) => {
  await db.query(
    `INSERT INTO logs (user_id, username, action, module, details, ip_address)
     VALUES ((SELECT id FROM users WHERE id = $1), $2, $3, $4, $5, $6)`,
    [userId ?? null, username ?? null, action, module, details, ipAddress ?? null],
  );
};

export const getAuditLogs = async ({ module, action, username, start, end }, db = pool) => {
  const result = await db.query(
    `SELECT logs.id, logs.username, logs.action, logs.module, logs.details,
      host(logs.ip_address) AS ip_address, logs.created_at,
      coalesce(users.first_name, attempted_user.first_name) AS first_name,
      coalesce(users.profile_image, attempted_user.profile_image) AS profile_image
    FROM logs
    LEFT JOIN users ON users.id = logs.user_id
    LEFT JOIN users AS attempted_user ON logs.user_id IS NULL
      AND logs.action = 'Login Failed' AND attempted_user.username = logs.username
    WHERE ($1::text IS NULL OR logs.module = $1)
      AND ($2::text IS NULL OR logs.action = $2)
      AND ($3::text IS NULL OR strpos(lower(coalesce(logs.username, '')), lower($3)) > 0)
      AND ($4::timestamptz IS NULL OR logs.created_at >= $4)
      AND ($5::timestamptz IS NULL OR logs.created_at < $5)
    ORDER BY logs.created_at DESC, logs.id DESC`,
    [module || null, action || null, username || null, start || null, end || null],
  );
  return result.rows;
};

export const getAuditSummary = async (db = pool) => {
  const result = await db.query(
    `SELECT count(*)::int AS total,
      count(*) FILTER (WHERE action = 'Login')::int AS login,
      count(*) FILTER (WHERE action = 'Edit')::int AS edit,
      count(*) FILTER (WHERE action = 'Add')::int AS add,
      count(*) FILTER (WHERE action = 'Login Failed')::int AS login_failed,
      coalesce(array_agg(DISTINCT module ORDER BY module), ARRAY[]::varchar[]) AS modules
    FROM logs`,
  );
  return result.rows[0];
};
