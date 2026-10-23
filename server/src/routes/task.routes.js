
const express = require("express");
const taskController = require("../controllers/task.controller");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.post("/", taskController.createTask);
router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
