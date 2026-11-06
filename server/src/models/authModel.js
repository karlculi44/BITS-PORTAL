import pool from "../config/db.js";

export const insertRefreshToken = async ({ userId, tokenHash, expiresAt }) => {
  await pool.query(
    `INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
};

export const revokeRefreshToken = async (tokenHash) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
};
