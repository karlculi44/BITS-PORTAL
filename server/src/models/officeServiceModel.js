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
