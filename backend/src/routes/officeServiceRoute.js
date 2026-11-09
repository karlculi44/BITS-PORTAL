import { Router } from "express";
import {
  createServiceController,
  deleteServiceController,
  getAllServicesController,
  getServiceLogoController,
  searchServicesController,
  setDefaultServiceController,
  updateServiceController,
} from "../controllers/serviceController.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/officeServiceSchema.js";
import validate from "../middlewares/validate.js";
import authorizeSection from "../middlewares/authorizeSection.js";
import verifyToken from "../middlewares/verifyToken.js";
import serviceLogoUpload from "../middlewares/serviceLogoUpload.js";
import validateServiceId from "../middlewares/validateServiceId.js";

const router = Router();

const normalizeMultipartNumbers = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    for (const field of ["category_id", "sort_order"]) {
      if (
        typeof req.body[field] === "string" &&
        req.body[field].trim() !== ""
      ) {
        req.body[field] = Number(req.body[field]);
      }
    }
  }

  next();
};

router.get("/images/:filename", getServiceLogoController);

router.get("/", getAllServicesController);

router.get("/search/:term", searchServicesController);

router.post(
  "/",
  verifyToken,
  authorizeSection("services"),
  serviceLogoUpload,
  normalizeMultipartNumbers,
  validate(createServiceSchema),
  createServiceController,
);

router.patch(
  "/:id",
  verifyToken,
  authorizeSection("services"),
  validateServiceId,
  serviceLogoUpload,
  normalizeMultipartNumbers,
  validate(updateServiceSchema),
  updateServiceController,
);

router.patch(
  "/:id/default",
  verifyToken,
  authorizeSection("services"),
  validateServiceId,
  setDefaultServiceController,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeSection("services"),
  validateServiceId,
  deleteServiceController,
);

export default router;
