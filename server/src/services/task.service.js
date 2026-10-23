
const taskRepository = require("../repositories/task.repository");
const prisma = require("../lib/prisma");

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateOptionalText(value, fieldName) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw createError(`${fieldName} must be a string or null`, 400);
  }
}

async function requireOwnedProject(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });

  if (!project) {
    throw createError("Project not found", 404);
  }

  return project;
}

async function requireOwnedTask(taskId, userId) {
  const task = await taskRepository.findById(taskId);

  if (!task || task.project.ownerId !== userId) {
    throw createError("Task not found", 404);
  }

  return task;
}

async function createTask(data, userId) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400);
  }

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw createError("Task title is required", 400);
  }

  if (typeof data.projectId !== "string" || !data.projectId.trim()) {
    throw createError("projectId is required", 400);
  }

  validateOptionalText(data.description, "Description");

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    throw createError("Invalid task status", 400);
  }

  if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
    throw createError("Invalid task priority", 400);
  }

  if (
    data.dueDate !== undefined &&
    data.dueDate !== null &&
    (typeof data.dueDate !== "string" ||
      Number.isNaN(Date.parse(data.dueDate)))
  ) {
    throw createError("dueDate must be a valid date", 400);
  }

  await requireOwnedProject(data.projectId, userId);

  return taskRepository.create({
    title: data.title.trim(),
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : null,
    projectId: data.projectId,
    createdById: userId,
    ...(data.status !== undefined && { status: data.status }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.dueDate !== undefined && {
      dueDate: data.dueDate === null ? null : new Date(data.dueDate),
    }),
  });
}

async function getAllTasks(filters = {}, userId) {
  const where = {
    project: { ownerId: userId },
  };

  if (filters.projectId !== undefined) {
    if (typeof filters.projectId !== "string" || !filters.projectId.trim()) {
      throw createError("Invalid projectId", 400);
    }

    where.projectId = filters.projectId;
  }

  if (filters.status !== undefined) {
    if (!VALID_STATUSES.includes(filters.status)) {
      throw createError("Invalid task status", 400);
    }

    where.status = filters.status;
  }

  return taskRepository.findAll(where);
}

async function getTaskById(id, userId) {
  return requireOwnedTask(id, userId);
}

async function updateTask(id, data, userId) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400);
  }

  const existing = await requireOwnedTask(id, userId);
  const updateData = {};

  if (data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw createError("Task title cannot be empty", 400);
    }

    updateData.title = data.title.trim();
  }

  if (data.description !== undefined) {
    validateOptionalText(data.description, "Description");

    updateData.description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : null;
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status)) {
      throw createError("Invalid task status", 400);
    }

    updateData.status = data.status;
  }

  if (data.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(data.priority)) {
      throw createError("Invalid task priority", 400);
    }

    updateData.priority = data.priority;
  }

  if (data.dueDate !== undefined) {
    if (
      data.dueDate !== null &&
      (typeof data.dueDate !== "string" ||
        Number.isNaN(Date.parse(data.dueDate)))
    ) {
      throw createError("dueDate must be a valid date", 400);
    }

    updateData.dueDate =
      data.dueDate === null ? null : new Date(data.dueDate);
  }

  if (Object.keys(updateData).length === 0) {
    throw createError("Provide at least one field to update", 400);
  }

  return taskRepository.update(existing.id, updateData);
}

async function deleteTask(id, userId) {
  const task = await requireOwnedTask(id, userId);
  return taskRepository.remove(task.id);
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
