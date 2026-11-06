import api from "./api";

export const getUsers = async () => {
  const response = await api.get("/users");
  if (!Array.isArray(response.data?.data)) {
    throw new Error("Invalid users response");
  }
  return response.data.data;
};

export const createUser = async (user) => {
  const response = await api.post("/users", user);
  return response.data;
};

export const updateUser = async (id, user) => {
  const response = await api.patch(`/users/${id}`, user);
  return response.data;
};
