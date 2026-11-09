import pool from "../config/db.js";

export const getAllCategories = async (type) => {
  const result = await pool.query(
    `SELECT id, name, type, is_active, is_default
    FROM categories
    WHERE ($1::text IS NULL OR type = $1)`,
    [type ?? null],
  );

  return result.rows;
};

export const getCategoryByName = async (name) => {
  const result = await pool.query(
    `SELECT id, name, type, is_active, is_default
    FROM categories
    WHERE name = $1`,
    [name],
  );

  return result.rows[0];
};

export const searchCategoriesByName = async (name) => {
  const result = await pool.query(
    `SELECT id, name, type, is_active, is_default
    FROM categories
    WHERE POSITION($1 IN name) > 0`,
    [name],
  );

  return result.rows;
};

export const insertCategory = async (name, type) => {
  const result = await pool.query(
    `INSERT INTO categories (name, type)
    VALUES ($1, $2)
    RETURNING id, name, type, is_active, is_default`,
    [name, type],
  );

  return result.rows[0];
};

export const updateCategory = async ({
  categoryId,
  name,
  type,
  isActive,
}) => {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (type !== undefined) {
    values.push(type);
    updates.push(`type = $${values.length}`);

    // Only service categories may be default.
    if (type !== "service") updates.push("is_default = false");
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
    RETURNING id, name, type, is_active, is_default`,
    values,
  );

  return result.rows[0];
};

export const setDefaultCategory = async (categoryId, isDefault) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock every service category so concurrent default changes serialize.
    const locked = await client.query(
      `SELECT id, type
      FROM categories
      WHERE type = 'service' OR id = $1
      ORDER BY id
      FOR UPDATE`,
      [categoryId],
    );
    const category = locked.rows.find((row) => row.id === categoryId);

    if (!category) {
      await client.query("ROLLBACK");
      return undefined;
    }

    if (category.type !== "service") {
      await client.query("ROLLBACK");
      const error = new Error("Only service categories can be default");
      error.code = "NOT_SERVICE_CATEGORY";
      throw error;
    }

    if (isDefault) {
      await client.query(
        `UPDATE categories
        SET is_default = false
        WHERE type = 'service' AND is_default = true AND id <> $1`,
        [categoryId],
      );
    }

    const result = await client.query(
      `UPDATE categories
      SET is_default = $1
      WHERE id = $2
      RETURNING id, name, type, is_active, is_default`,
      [isDefault, categoryId],
    );
    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    if (error.code !== "NOT_SERVICE_CATEGORY") {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
};
export const deleteCategory = async (categoryId) => {
  const result = await pool.query(
    `DELETE FROM categories
    WHERE id = $1
    RETURNING id, name, type, is_active, is_default`,
    [categoryId],
  );

  return result.rows[0];
};
