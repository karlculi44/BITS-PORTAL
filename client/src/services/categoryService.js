import api from "./api";

export const getCategories = async (type) => {
  const response = await api.get("/categories", { params: { type } });
  if (!Array.isArray(response.data)) {
    throw new Error("Invalid categories response");
  }
  return response.data;
};

export const createCategory = async (category) => {
  const response = await api.post("/categories", category);
  return response.data;
};

export const updateCategory = async (id, category) => {
  const response = await api.patch(`/categories/${id}`, category);
  return response.data;
};

export const setDefaultCategory = async (id, isDefault) => {
  const response = await api.patch(`/categories/${id}/default`, { isDefault });
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
