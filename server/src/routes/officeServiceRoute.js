import { Router } from "express";
import {
  createServiceController,
  searchServicesController,
  updateServiceController,
} from "../controllers/serviceController.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/officeServiceSchema.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/search/:term", searchServicesController);

router.post(
  "/",
  validate(createServiceSchema),
  verifyToken,
  authorize("admin"),
  createServiceController,
);

router.patch(
  "/:id",
  validate(updateServiceSchema),
  verifyToken,
  authorize("admin"),
  updateServiceController,
);

export default router;
