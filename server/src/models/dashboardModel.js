import pool from "../config/db.js";

export const getDashboardData = async () => {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE is_active = true) AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE is_active = false) AS inactive_users,
      (SELECT COUNT(*)::int FROM categories) AS total_categories,
      (SELECT COUNT(*)::int FROM categories WHERE is_active = true) AS active_categories,
      (SELECT COUNT(*)::int FROM categories WHERE is_active = false) AS inactive_categories,
      (SELECT COUNT(*)::int FROM services) AS total_services,
      (SELECT COUNT(*)::int FROM policies) AS total_policies`,
  );

  return result.rows[0];
};
