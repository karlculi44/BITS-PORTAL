import { Router } from "express";
import {
  createServiceController,
  deleteServiceController,
  getAllServicesController,
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

router.get("/", getAllServicesController);

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

router.delete("/:id", verifyToken, authorize("admin"), deleteServiceController);

export default router;
