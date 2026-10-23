
const express = require("express");
const cors = require("cors");
const { CLIENT_URL, CORS_ORIGIN } = require("./config/env");

const healthRouter = require("./routes/health.routes");
const projectRouter = require("./routes/project.routes");
const taskRouter = require("./routes/task.routes");
const authRouter = require("./routes/auth.routes");

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
];

const customOrigins = [CLIENT_URL, CORS_ORIGIN, process.env.CLIENT_URL, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .flatMap((entry) => entry.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...customOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests or allowed browser origins
      if (!origin || allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to FlowForge API",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/auth", authRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// Centralized JSON error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON payload in request body",
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;

  return res.status(statusCode).json({
    error: {
      code:
        err.code ||
        (statusCode === 400
          ? "VALIDATION_ERROR"
          : statusCode === 401
            ? "UNAUTHORIZED"
            : statusCode === 404
              ? "NOT_FOUND"
              : statusCode === 409
                ? "CONFLICT"
                : "INTERNAL_SERVER_ERROR"),
      message:
        statusCode >= 500
          ? "Something went wrong"
          : err.message || "An unexpected error occurred",
    },
  });
});

module.exports = app;
