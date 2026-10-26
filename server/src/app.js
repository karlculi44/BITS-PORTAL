import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pool from "./config/db.js";
import userRoute from "./routes/userRoute.js";
import authRoute from "./routes/authRoute.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    next(error);
  }
});

// user routes
app.use("/api/users", userRoute);

// auth route
app.use("/api/auth", authRoute);

// Error handler
app.use(errorHandler);

export default app;
