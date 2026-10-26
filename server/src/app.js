import express from "express";
import cors from "cors";
import helmet from "helmet";
import pool from "./config/db.js";
import userRoute from "./routes/userRoute.js";

const app = express();

// Middleware
app.use(helmet());

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

export default app;
