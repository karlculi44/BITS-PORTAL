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

export const insertService = async ({
  title,
  url,
  image,
  description,
  sort_order,
  category_id,
}) => {
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

  const result = await pool.query(
    `INSERT INTO services (${columns.join(", ")})
    SELECT ${placeholders.join(", ")}, category.id
    FROM categories AS category
    WHERE category.id = $${values.length}
      AND category.type = 'service'
    FOR SHARE
    RETURNING id, title, url, image, description, sort_order, category_id, created_at, updated_at`,
    values,
  );

  return result.rows[0];
};

export const searchServices = async (term) => {
  const result = await pool.query(
    `SELECT id, title, url, image, description, sort_order, category_id, created_at, updated_at
    FROM services
    WHERE POSITION($1 IN title) > 0
      OR POSITION($1 IN description) > 0`,
    [term],
  );

  return result.rows;
};

export const updateService = async (serviceId, service) => {
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

  const query = categoryIdIndex === undefined
    ? `UPDATE services
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING
        services.id,
        services.title,
        services.url,
        services.image,
        services.description,
        services.sort_order,
        services.category_id,
        services.created_at,
        services.updated_at`
    : `WITH service_category AS MATERIALIZED (
        SELECT id
        FROM categories
        WHERE id = $${categoryIdIndex}
          AND type = 'service'
        FOR SHARE
      )
      UPDATE services
      SET ${updates.join(", ")}
      FROM service_category
      WHERE services.id = $${values.length}
      RETURNING
        services.id,
        services.title,
        services.url,
        services.image,
        services.description,
        services.sort_order,
        services.category_id,
        services.created_at,
        services.updated_at`;

  const result = await pool.query(query, values);

  return result.rows[0];
};
