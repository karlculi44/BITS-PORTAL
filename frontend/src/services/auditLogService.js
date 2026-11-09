import api from "./api";

export const getAuditLogs = async (filters, signal) => {
  const params = {
    module: filters.module || undefined,
    action: filters.action || undefined,
    username: filters.username.trim() || undefined,
  };
  if (filters.date) {
    const [year, month, day] = filters.date.split("-").map(Number);
    params.start = new Date(year, month - 1, day).toISOString();
    params.end = new Date(year, month - 1, day + 1).toISOString();
  }
  const response = await api.get("/audit-logs", { params, signal });
  if (!Array.isArray(response.data?.logs) || !response.data?.summary ||
      !Array.isArray(response.data.summary.modules)) {
    throw new Error("Invalid audit logs response");
  }
  return response.data;
};
