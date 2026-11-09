import AppError from "../utils/AppError.js";

const validatePolicyId = (req, res, next) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    next(new AppError("Invalid policy ID", 400));
    return;
  }

  next();
};

export default validatePolicyId;
