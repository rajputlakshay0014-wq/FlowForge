
const express = require("express");
const cors = require("cors");

const healthRouter = require("./routes/health.routes");
const projectRouter = require("./routes/project.routes");
const taskRouter = require("./routes/task.routes");
const authRouter = require("./routes/auth.routes");
const authenticateToken = require("./middleware/auth.middleware");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
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

// Protected route: requires a valid JWT
app.get("/api/auth/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    message: "Authenticated successfully",
    userId: req.user.id,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

module.exports = app;
