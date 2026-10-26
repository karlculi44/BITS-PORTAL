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
