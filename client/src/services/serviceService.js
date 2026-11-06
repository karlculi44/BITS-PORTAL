import api from "./api";

export const getServiceCategories = async () => {
  const response = await api.get("/categories");
  if (!Array.isArray(response.data)) {
    throw new Error("Invalid categories response");
  }
  return response.data.filter((category) => category.type === "service");
};

export const createService = async (service) => {
  const response = await api.post("/services", service);
  return response.data;
};

export const updateService = async (id, service) => {
  const response = await api.patch(`/services/${id}`, service);
  return response.data;
};
