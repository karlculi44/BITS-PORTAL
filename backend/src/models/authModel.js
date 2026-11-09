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

export const rotateRefreshToken = async ({
  tokenHash,
  userId,
  nextTokenHash,
  expiresAt,
}) => {
  const result = await pool.query(
    `WITH consumed AS (
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
        AND user_id = $2
        AND revoked_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING user_id
    )
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    SELECT user_id, $3, $4 FROM consumed
    RETURNING user_id`,
    [tokenHash, userId, nextTokenHash, expiresAt],
  );
  return result.rowCount > 0;
};
