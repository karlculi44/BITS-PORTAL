import pool from "../config/db.js";

export const getCategoryById = async (categoryId) => {
  const result = await pool.query(
    `SELECT id, type
    FROM categories
    WHERE id = $1`,
    [categoryId],
  );

  return result.rows[0];
};

export const insertPolicy = async ({
  title,
  description,
  file,
  category_id,
}) => {
  const result = await pool.query(
    `INSERT INTO policies (title, description, file, category_id)
    SELECT $1, $2, $3, category.id
    FROM categories AS category
    WHERE category.id = $4
      AND category.type = 'policy'
    FOR SHARE
    RETURNING id, category_id, title, description, file, created_at, updated_at`,
    [title, description ?? null, file, category_id],
  );

  return result.rows[0];
};
