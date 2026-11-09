import { z } from "zod";
import * as userModel from "../models/userModel.js";
import * as auditLogService from "../services/auditLogService.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const querySchema = z.object({
  module: z.string().max(50).optional(),
  action: z.string().max(50).optional(),
  username: z.string().max(50).optional(),
  start: z.iso.datetime({ offset: true }).optional(),
  end: z.iso.datetime({ offset: true }).optional(),
}).strict().refine(
  (query) => (!query.start && !query.end) ||
    (query.start && query.end && new Date(query.start) < new Date(query.end)),
);

export const getAuditLogsController = asyncHandler(async (req, res) => {
  const user = await userModel.getUserById(req.user.sub);
  if (!user?.is_active || user.role !== "admin") {
    throw new AppError("You do not have access to this resource.", 403);
  }
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError("Invalid audit log filters", 400);
  res.json(await auditLogService.getAuditLogs(parsed.data));
});
