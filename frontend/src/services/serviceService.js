import api from "./api";
import bitsLogo from "../assets/images/bits-trimmed.png";

export const DEFAULT_SERVICE_LOGO = "bits-default";

export const getServiceLogoUrl = (image) =>
  !image?.trim() || image === DEFAULT_SERVICE_LOGO
    ? bitsLogo
    : getServiceImageUrl(image);

export const getServiceImageUrl = (image) => {
  if (!image?.trim()) return "";

  try {
    const apiBase = new URL(
      api.defaults.baseURL || "/api",
      window.location.origin,
    );
    return new URL(image, apiBase).toString();
  } catch {
    return image;
  }
};

export const getServiceCategories = async () => {
  const response = await api.get("/categories", { params: { type: "service" } });
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

export const deleteService = async (id) => {
  const response = await api.delete(`/services/${id}`);
  return response.data;
};
