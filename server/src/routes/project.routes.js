
const express = require("express");
const projectController = require("../controllers/project.controller");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.post("/", projectController.createProject);
router.get("/", projectController.getAllProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.delete("/:id", projectController.deleteProject);

module.exports = router;
