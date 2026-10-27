import pool from "../config/db.js";

export const getAllCategories = async () => {
  const result = await pool.query(
    `SELECT id, name, description, type, is_active
    FROM categories`,
  );

  return result.rows;
};

export const getCategoryByName = async (name) => {
  const result = await pool.query(
    `SELECT id, name, description, type, is_active
    FROM categories
    WHERE name = $1`,
    [name],
  );

  return result.rows[0];
};

export const searchCategoriesByName = async (name) => {
  const result = await pool.query(
    `SELECT id, name, description, type, is_active
    FROM categories
    WHERE POSITION($1 IN name) > 0`,
    [name],
  );

  return result.rows;
};

export const insertCategory = async (name, description, type) => {
  const result = await pool.query(
    `INSERT INTO categories (name, description, type)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, type, is_active`,
    [name, description, type],
  );

  return result.rows[0];
};

export const updateCategory = async ({
  categoryId,
  name,
  description,
  type,
  isActive,
}) => {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (description !== undefined) {
    values.push(description);
    updates.push(`description = $${values.length}`);
  }

  if (type !== undefined) {
    values.push(type);
    updates.push(`type = $${values.length}`);
  }

  if (isActive !== undefined) {
    values.push(isActive);
    updates.push(`is_active = $${values.length}`);
  }

  values.push(categoryId);

  const result = await pool.query(
    `UPDATE categories
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
    RETURNING id, name, description, type, is_active`,
    values,
  );

  return result.rows[0];
};

export const deleteCategory = async (categoryId) => {
  const result = await pool.query(
    `DELETE FROM categories
    WHERE id = $1
    RETURNING id, name, description, type, is_active`,
    [categoryId],
  );

  return result.rows[0];
};
