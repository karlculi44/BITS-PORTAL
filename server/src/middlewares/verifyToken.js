import jwt from "jsonwebtoken";

const verifyToken = async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    return next(error);
  }
};

export default verifyToken;
