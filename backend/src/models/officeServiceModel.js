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

export const getAllServices = async () => {
  const result = await pool.query(
    `SELECT id, title, url, image, description, sort_order, category_id, is_default, created_at, updated_at
    FROM services
    ORDER BY sort_order ASC, id ASC`,
  );

  return result.rows;
};

export const insertService = async ({
  title,
  url,
  image,
  description,
  sort_order,
  category_id,
}, db = pool) => {
  const columns = ["title", "url", "image", "description"];
  const values = [title, url, image ?? null, description];
  const placeholders = ["$1", "$2", "$3", "$4"];

  if (sort_order !== undefined) {
    columns.push("sort_order");
    values.push(sort_order);
    placeholders.push(`$${values.length}`);
  }

  values.push(category_id);
  columns.push("category_id");

  const result = await db.query(
    `INSERT INTO services (${columns.join(", ")})
    SELECT ${placeholders.join(", ")}, category.id
    FROM categories AS category
    WHERE category.id = $${values.length}
      AND category.type = 'service'
    FOR SHARE
    RETURNING id, title, url, image, description, sort_order, category_id, is_default, created_at, updated_at`,
    values,
  );

  return result.rows[0];
};

export const searchServices = async (term) => {
  const result = await pool.query(
    `SELECT id, title, url, image, description, sort_order, category_id, is_default, created_at, updated_at
    FROM services
    WHERE POSITION($1 IN title) > 0
      OR POSITION($1 IN description) > 0`,
    [term],
  );

  return result.rows;
};

export const isServiceImageReferenced = async (image) => {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM services
      WHERE image = $1
    ) AS referenced`,
    [image],
  );

  return result.rows[0].referenced;
};

export const updateService = async (serviceId, service, db = pool) => {
  const updates = [];
  const values = [];
  let categoryIdIndex;

  if (service.title !== undefined) {
    values.push(service.title);
    updates.push(`title = $${values.length}`);
  }

  if (service.url !== undefined) {
    values.push(service.url);
    updates.push(`url = $${values.length}`);
  }

  if (service.description !== undefined) {
    values.push(service.description);
    updates.push(`description = $${values.length}`);
  }

  if (service.image !== undefined) {
    values.push(service.image);
    updates.push(`image = $${values.length}`);
  }

  if (service.sort_order !== undefined) {
    values.push(service.sort_order);
    updates.push(`sort_order = $${values.length}`);
  }

  if (service.category_id !== undefined) {
    values.push(service.category_id);
    categoryIdIndex = values.length;
    updates.push(`category_id = $${values.length}`);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(serviceId);
  const serviceIdIndex = values.length;
  const ctes = [
    `existing_service AS MATERIALIZED (
      SELECT id, image, category_id
      FROM services
      WHERE id = $${serviceIdIndex}
      FOR UPDATE
    )`,
  ];
  let from = "existing_service";

  if (categoryIdIndex !== undefined) {
    ctes.push(`service_category AS MATERIALIZED (
      SELECT id
      FROM categories
      WHERE id = $${categoryIdIndex}
        AND type = 'service'
      FOR SHARE
    )`);
    from += ", service_category";
  }

  const query = `WITH ${ctes.join(", ")}
      UPDATE services
      SET ${updates.join(", ")}
      FROM ${from}
      WHERE services.id = existing_service.id
      RETURNING
        services.id,
        services.title,
        services.url,
        services.image,
        services.description,
        services.sort_order,
        services.category_id,
        services.is_default,
        services.created_at,
        services.updated_at,
        existing_service.image AS previous_image,
        existing_service.category_id AS previous_category_id`;

  const result = await db.query(query, values);

  return result.rows[0];
};

export const setDefaultService = async (serviceId, db = pool) => {
  const result = await db.query(
    `WITH target AS MATERIALIZED (
      SELECT id
      FROM services
      WHERE id = $1
      FOR UPDATE
    ),
    cleared AS (
      UPDATE services
      SET is_default = false, updated_at = CURRENT_TIMESTAMP
      WHERE is_default = true
        AND id <> $1
        AND EXISTS (SELECT 1 FROM target)
    )
    UPDATE services
    SET is_default = true, updated_at = CURRENT_TIMESTAMP
    FROM target
    WHERE services.id = target.id
    RETURNING services.id, services.title, services.url, services.image, services.description, services.sort_order, services.category_id, services.is_default, services.created_at, services.updated_at`,
    [serviceId],
  );

  return result.rows[0];
};

export const deleteService = async (serviceId, db = pool) => {
  const result = await db.query(
    `DELETE FROM services
    WHERE id = $1
    RETURNING id, title, url, image, description, sort_order, category_id, is_default, created_at, updated_at`,
    [serviceId],
  );

  return result.rows[0];
};
