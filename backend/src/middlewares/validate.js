import { removeServiceLogo } from "../utils/serviceLogo.js";

const validate = (schema) => {
  return async (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      if (req.file?.filename) {
        try {
          await (req.removeUploadedFile ?? removeServiceLogo)(
            req.file.filename,
          );
        } catch (error) {
          return next(error);
        }
      }

      return res.status(400).json({
        errors: result.error.issues,
      });
    }

    req.body = result.data;
    next();
  };
};

export default validate;
