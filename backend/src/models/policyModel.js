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

export const getAllPolicies = async () => {
  const result = await pool.query(
    `SELECT
      policies.id,
      policies.category_id,
      categories.name AS category_name,
      policies.title,
      policies.description,
      policies.file,
      policies.created_at,
      policies.updated_at
    FROM policies
    INNER JOIN categories ON categories.id = policies.category_id
    ORDER BY policies.id ASC`,
  );

  return result.rows;
};

export const getPolicyById = async (policyId) => {
  const result = await pool.query(
    `SELECT id, category_id, title, description, file
    FROM policies
    WHERE id = $1`,
    [policyId],
  );

  return result.rows[0];
};

export const isPolicyDocumentReferenced = async (file) => {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM policies
      WHERE file = $1
    ) AS referenced`,
    [file],
  );

  return result.rows[0].referenced;
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

export const updatePolicy = async (policyId, policy) => {
  const updates = [];
  const values = [];
  let categoryIdIndex;

  if (policy.title !== undefined) {
    values.push(policy.title);
    updates.push(`title = $${values.length}`);
  }

  if (policy.description !== undefined) {
    values.push(policy.description);
    updates.push(`description = $${values.length}`);
  }

  if (policy.file !== undefined) {
    values.push(policy.file);
    updates.push(`file = $${values.length}`);
  }

  if (policy.category_id !== undefined) {
    values.push(policy.category_id);
    categoryIdIndex = values.length;
    updates.push(`category_id = $${values.length}`);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(policyId);
  const policyIdIndex = values.length;
  const ctes = [
    `existing_policy AS MATERIALIZED (
      SELECT id, file
      FROM policies
      WHERE id = $${policyIdIndex}
      FOR UPDATE
    )`,
  ];
  let from = "existing_policy";

  if (categoryIdIndex !== undefined) {
    ctes.push(`policy_category AS MATERIALIZED (
        SELECT id
        FROM categories
        WHERE id = $${categoryIdIndex}
          AND type = 'policy'
        FOR SHARE
      )`);
    from += ", policy_category";
  }

  const query = `WITH ${ctes.join(", ")}
      UPDATE policies
      SET ${updates.join(", ")}
      FROM ${from}
      WHERE policies.id = existing_policy.id
      RETURNING
        policies.id,
        policies.category_id,
        policies.title,
        policies.description,
        policies.file,
        policies.created_at,
        policies.updated_at,
        existing_policy.file AS previous_file`;

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const deletePolicy = async (policyId) => {
  const result = await pool.query(
    `DELETE FROM policies
    WHERE id = $1
    RETURNING id, category_id, title, description, file, created_at, updated_at`,
    [policyId],
  );

  return result.rows[0];
};
