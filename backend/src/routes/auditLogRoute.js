import { Router } from "express";
import verifyToken from "../middlewares/verifyToken.js";
import { getAuditLogsController } from "../controllers/auditLogController.js";

const router = Router();

router.get("/", verifyToken, getAuditLogsController);

export default router;
