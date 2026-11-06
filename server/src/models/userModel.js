import pool from "../config/db.js";

// Admins always have full access, regardless of the stored permission values.
const permissionColumns = `
      (role = 'admin' OR can_access_services) AS can_access_services,
      (role = 'admin' OR can_access_policies) AS can_access_policies,
      (role = 'admin' OR can_access_categories) AS can_access_categories`;

const userColumns = `
      id,
      first_name,
      last_name,
      username,
      role,
      is_active,
      profile_image,${permissionColumns}`;

export const insertUser = async ({
  firstName,
  lastName,
  username,
  passwordHash,
  role,
  profileImage = null,
  canAccessServices = false,
  canAccessPolicies = false,
  canAccessCategories = false,
}) => {
  const result = await pool.query(
    `INSERT INTO users (
      first_name,
      last_name,
      username,
      password_hash,
      role,
      profile_image,
      can_access_services,
      can_access_policies,
      can_access_categories
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING${userColumns},
      created_at`,
    [
      firstName,
      lastName,
      username,
      passwordHash,
      role,
      profileImage,
      canAccessServices,
      canAccessPolicies,
      canAccessCategories,
    ],
  );

  return result.rows[0];
};

export const getUserByUsername = async (username) => {
  const result = await pool.query(
    `SELECT${userColumns},
      created_at
    FROM users
    WHERE username = $1`,
    [username],
  );

  return result.rows[0];
};

export const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT${userColumns},
      created_at
    FROM users
    WHERE id = $1`,
    [id],
  );

  return result.rows[0];
};

export const getAllUsers = async () => {
  const result = await pool.query(
    `SELECT${userColumns},
      created_at,
      updated_at
    FROM users
    ORDER BY id ASC`,
  );

  return result.rows;
};

export const deleteUser = async (userId) => {
  const result = await pool.query(
    `DELETE FROM users
    WHERE id = $1
    RETURNING${userColumns},
      created_at,
      updated_at`,
    [userId],
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
  profileImage,
  canAccessServices,
  canAccessPolicies,
  canAccessCategories,
}) => {
  const updates = [];
  const values = [];

  const columns = {
    first_name: firstName,
    last_name: lastName,
    username,
    password_hash: passwordHash,
    role,
    is_active: isActive,
    profile_image: profileImage,
    can_access_services: canAccessServices,
    can_access_policies: canAccessPolicies,
    can_access_categories: canAccessCategories,
  };

  for (const [column, value] of Object.entries(columns)) {
    if (value !== undefined) {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    }
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE users
    SET ${updates.join(", ")},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING${userColumns},
      created_at,
      updated_at`,
    values,
  );

  return result.rows[0];
};

export const getUserForLogin = async (username) => {
  const result = await pool.query(
    `SELECT${userColumns},
      password_hash,
      created_at
    FROM users
    WHERE username = $1`,
    [username],
  );

  return result.rows[0];
};
