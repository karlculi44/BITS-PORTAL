import pool from "../config/db.js";

export const insertUser = async ({
  firstName,
  lastName,
  username,
  passwordHash,
  role,
}) => {
  const result = await pool.query(
    `INSERT INTO users (
      first_name,
      last_name,
      username,
      password_hash,
      role
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      first_name,
      last_name,
      username,
      role,
      is_active,
      created_at`,
    [firstName, lastName, username, passwordHash, role],
  );

  return result.rows[0];
};

export const getUserByUsername = async (username) => {
  const result = await pool.query(
    `SELECT
      id,
      first_name,
      last_name,
      username,
      role,
      is_active,
      created_at
    FROM users
    WHERE username = $1`,
    [username],
  );

  return result.rows[0];
};

export const updateUser = async ({
  userId,
  firstName,
  lastName,
  username,
  passwordHash,
  role,
  isActive,
}) => {
  const updates = [];
  const values = [];

  if (firstName !== undefined) {
    values.push(firstName);
    updates.push(`first_name = $${values.length}`);
  }

  if (lastName !== undefined) {
    values.push(lastName);
    updates.push(`last_name = $${values.length}`);
  }

  if (username !== undefined) {
    values.push(username);
    updates.push(`username = $${values.length}`);
  }

  if (passwordHash !== undefined) {
    values.push(passwordHash);
    updates.push(`password_hash = $${values.length}`);
  }

  if (role !== undefined) {
    values.push(role);
    updates.push(`role = $${values.length}`);
  }

  if (isActive !== undefined) {
    values.push(isActive);
    updates.push(`is_active = $${values.length}`);
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE users
    SET ${updates.join(", ")},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING
      id,
      first_name,
      last_name,
      username,
      role,
      is_active,
      created_at,
      updated_at`,
    values,
  );

  return result.rows[0];
};

export const getUserForLogin = async (username) => {
  const result = await pool.query(
    `SELECT
      id,
      first_name,
      last_name,
      username,
      password_hash,
      role,
      is_active,
      created_at
    FROM users
    WHERE username = $1`,
    [username],
  );

  return result.rows[0];
};
