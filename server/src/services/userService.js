import pool from "../config/db.js";

export async function createUser({ name, email }) {
  const result = await pool.query(
    `INSERT INTO users (name, email)
     VALUES ($1, $2)
     RETURNING id, name, email`,
    [name, email],
  );

  return result.rows[0];
}
