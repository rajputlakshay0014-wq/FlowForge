
const projectService = require("../services/project.service");

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    error: {
      code:
        statusCode === 404
          ? "NOT_FOUND"
          : statusCode === 400
            ? "VALIDATION_ERROR"
            : "INTERNAL_SERVER_ERROR",
      message:
        statusCode >= 500
          ? "Something went wrong"
          : error.message,
    },
  });
}

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(
      req.body,
      req.user.id
    );

    return res.status(201).json({ project });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAllProjects(req, res) {
  try {
    const projects = await projectService.getAllProjects(req.user.id);
    return res.status(200).json({ projects });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getProjectById(req, res) {
  try {
    const project = await projectService.getProjectById(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({ project });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateProject(req, res) {
  try {
    const project = await projectService.updateProject(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json({ project });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteProject(req, res) {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
