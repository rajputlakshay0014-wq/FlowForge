
const taskService = require("../services/task.service");

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    error: {
      code:
        statusCode === 400
          ? "VALIDATION_ERROR"
          : statusCode === 404
            ? "NOT_FOUND"
            : "INTERNAL_SERVER_ERROR",
      message:
        statusCode >= 500
          ? "Something went wrong"
          : error.message,
    },
  });
}

async function createTask(req, res) {
  try {
    const task = await taskService.createTask(
      req.body,
      req.user.id
    );

    return res.status(201).json({ task });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAllTasks(req, res) {
  try {
    const tasks = await taskService.getAllTasks(
      {
        projectId: req.query.projectId,
        status: req.query.status,
      },
      req.user.id
    );

    return res.status(200).json({ tasks });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getTaskById(req, res) {
  try {
    const task = await taskService.getTaskById(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({ task });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateTask(req, res) {
  try {
    const task = await taskService.updateTask(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json({ task });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteTask(req, res) {
  try {
    await taskService.deleteTask(
      req.params.id,
      req.user.id
    );

    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
