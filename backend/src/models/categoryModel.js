import pool from "../config/db.js";

export const getAllCategories = async (type) => {
  const result = await pool.query(
    `SELECT
      categories.id,
      categories.name,
      categories.type,
      categories.is_active,
      categories.is_default,
      CASE
        WHEN categories.type = 'service' THEN COUNT(DISTINCT services.id)
        WHEN categories.type = 'policy' THEN COUNT(DISTINCT policies.id)
        ELSE 0
      END::int AS item_count
    FROM categories
    LEFT JOIN services
      ON categories.type = 'service'
      AND services.category_id = categories.id
    LEFT JOIN policies
      ON categories.type = 'policy'
      AND policies.category_id = categories.id
    WHERE ($1::text IS NULL OR categories.type = $1)
    GROUP BY
      categories.id,
      categories.name,
      categories.type,
      categories.is_active,
      categories.is_default`,
    [type ?? null],
  );

  return result.rows;
};

export const getCategoryByName = async (name, type, excludeCategoryId) => {
  const result = await pool.query(
    `SELECT id, name, type, is_active, is_default
    FROM categories
    WHERE name = $1
      AND ($2::text IS NULL OR type = $2)
      AND ($3::integer IS NULL OR id <> $3)`,
    [name, type ?? null, excludeCategoryId ?? null],
  );

  return result.rows[0];
};

export const getCategoryById = async (categoryId, db = pool) => {
  const result = await db.query(
    `SELECT id, name, type, is_active, is_default
    FROM categories
    WHERE id = $1`,
    [categoryId],
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

export const insertCategory = async (name, type, db = pool) => {
  const result = await db.query(
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
}, db = pool) => {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (isActive !== undefined) {
    values.push(isActive);
    updates.push(`is_active = $${values.length}`);
  }

  values.push(categoryId);

  const result = await db.query(
    db === pool
      ? `UPDATE categories
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING id, name, type, is_active, is_default`
      : `WITH previous AS MATERIALIZED (
          SELECT id, name FROM categories WHERE id = $${values.length} FOR UPDATE
        )
        UPDATE categories SET ${updates.join(", ")}
        FROM previous WHERE categories.id = previous.id
        RETURNING categories.id, categories.name, categories.type, categories.is_active,
          categories.is_default, previous.name AS previous_name`,
    values,
  );

  return result.rows[0];
};

export const setDefaultCategory = async (categoryId, isDefault, transactionClient) => {
  const client = transactionClient || await pool.connect();

  try {
    if (!transactionClient) await client.query("BEGIN");

    // Lock every service category so concurrent default changes serialize.
    const locked = await client.query(
      `SELECT id, type, is_default
      FROM categories
      WHERE type = 'service' OR id = $1
      ORDER BY id
      FOR UPDATE`,
      [categoryId],
    );
    const category = locked.rows.find((row) => row.id === categoryId);

    if (!category) {
      if (!transactionClient) await client.query("ROLLBACK");
      return undefined;
    }

    if (category.type !== "service") {
      if (!transactionClient) await client.query("ROLLBACK");
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
    if (!transactionClient) await client.query("COMMIT");

    return transactionClient
      ? { ...result.rows[0], previous_default: category.is_default }
      : result.rows[0];
  } catch (error) {
    if (!transactionClient && error.code !== "NOT_SERVICE_CATEGORY") {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (!transactionClient) client.release();
  }
};
export const deleteCategory = async (categoryId, db = pool) => {
  const result = await db.query(
    `DELETE FROM categories
    WHERE id = $1
    RETURNING id, name, type, is_active, is_default`,
    [categoryId],
  );

  return result.rows[0];
};
