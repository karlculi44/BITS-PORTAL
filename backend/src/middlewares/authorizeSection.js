import * as userModel from "../models/userModel.js";
import AppError from "../utils/AppError.js";

// Admins always pass. Staff are checked against their current stored
// permissions so changes apply immediately, without waiting for token expiry.
const authorizeSection = (...sections) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("You do not have access this resource.", 403);
      }

      if (req.user.role === "admin") {
        next();
        return;
      }

      const user = await userModel.getUserById(req.user.sub);
      const hasAccess =
        user?.is_active &&
        sections.some((section) => user[`can_access_${section}`] === true);

      if (!hasAccess) {
        throw new AppError("You do not have access this resource.", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizeSection;
