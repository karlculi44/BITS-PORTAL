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
      (SELECT COUNT(*)::int FROM policies) AS total_policies,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object('name', category_counts.name, 'count', category_counts.count)
            ORDER BY category_counts.name
          ),
          '[]'::json
        )
        FROM (
          SELECT categories.name, COUNT(services.id)::int AS count
          FROM services
          JOIN categories
            ON categories.id = services.category_id
            AND categories.type = 'service'
          GROUP BY categories.id, categories.name
        ) AS category_counts
      ) AS services_by_category,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object('name', category_counts.name, 'count', category_counts.count)
            ORDER BY category_counts.name
          ),
          '[]'::json
        )
        FROM (
          SELECT categories.name, COUNT(policies.id)::int AS count
          FROM policies
          JOIN categories
            ON categories.id = policies.category_id
            AND categories.type = 'policy'
          GROUP BY categories.id, categories.name
        ) AS category_counts
      ) AS policies_by_category`,
  );

  return result.rows[0];
};
