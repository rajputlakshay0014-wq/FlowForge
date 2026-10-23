
const taskRepository = require("../repositories/task.repository");
const prisma = require("../lib/prisma");

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function assertValidUserId(userId) {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw createError("User authentication required", 401, "UNAUTHORIZED");
  }
  return userId.trim();
}

function validateTaskTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    throw createError("Task title is required", 400, "VALIDATION_ERROR");
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    throw createError("Task title cannot exceed 200 characters", 400, "VALIDATION_ERROR");
  }
  return trimmed;
}

function validateTaskDescription(description) {
  if (description === undefined || description === null) {
    return null;
  }
  if (typeof description !== "string") {
    throw createError("Description must be a string or null", 400, "VALIDATION_ERROR");
  }
  const trimmed = description.trim();
  if (trimmed.length > 2000) {
    throw createError("Description cannot exceed 2000 characters", 400, "VALIDATION_ERROR");
  }
  return trimmed || null;
}

function validateDueDate(dueDate) {
  if (dueDate === undefined) return undefined;
  if (dueDate === null) return null;
  if (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate))) {
    throw createError("dueDate must be a valid date", 400, "VALIDATION_ERROR");
  }
  return new Date(dueDate);
}

async function requireOwnedProject(projectId, userId) {
  const validUserId = assertValidUserId(userId);

  if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
    throw createError("Project not found", 404, "NOT_FOUND");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId.trim(), ownerId: validUserId },
    select: { id: true },
  });

  if (!project) {
    throw createError("Project not found", 404, "NOT_FOUND");
  }

  return project;
}

async function requireOwnedTask(taskId, userId) {
  const validUserId = assertValidUserId(userId);

  if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
    throw createError("Task not found", 404, "NOT_FOUND");
  }

  const task = await taskRepository.findById(taskId.trim());

  if (!task || !task.project || task.project.ownerId !== validUserId) {
    throw createError("Task not found", 404, "NOT_FOUND");
  }

  return task;
}

async function createTask(data, userId) {
  const validUserId = assertValidUserId(userId);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400, "VALIDATION_ERROR");
  }

  const title = validateTaskTitle(data.title);

  if (typeof data.projectId !== "string" || !data.projectId.trim()) {
    throw createError("projectId is required", 400, "VALIDATION_ERROR");
  }

  const description = validateTaskDescription(data.description);

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    throw createError("Invalid task status", 400, "VALIDATION_ERROR");
  }

  if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
    throw createError("Invalid task priority", 400, "VALIDATION_ERROR");
  }

  const dueDate = validateDueDate(data.dueDate);

  await requireOwnedProject(data.projectId, validUserId);

  return taskRepository.create({
    title,
    description,
    projectId: data.projectId.trim(),
    createdById: validUserId,
    ...(data.status !== undefined && { status: data.status }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(dueDate !== undefined && { dueDate }),
  });
}

async function getAllTasks(filters = {}, userId) {
  const validUserId = assertValidUserId(userId);

  const where = {
    project: { ownerId: validUserId },
  };

  if (filters.projectId !== undefined) {
    if (typeof filters.projectId !== "string" || !filters.projectId.trim()) {
      throw createError("Invalid projectId", 400, "VALIDATION_ERROR");
    }

    where.projectId = filters.projectId.trim();
  }

  if (filters.status !== undefined) {
    if (!VALID_STATUSES.includes(filters.status)) {
      throw createError("Invalid task status", 400, "VALIDATION_ERROR");
    }

    where.status = filters.status;
  }

  return taskRepository.findAll(where);
}

async function getTaskById(id, userId) {
  const validUserId = assertValidUserId(userId);
  return requireOwnedTask(id, validUserId);
}

async function updateTask(id, data, userId) {
  const validUserId = assertValidUserId(userId);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400, "VALIDATION_ERROR");
  }

  const existing = await requireOwnedTask(id, validUserId);
  const updateData = {};

  if (data.title !== undefined) {
    updateData.title = validateTaskTitle(data.title);
  }

  if (data.description !== undefined) {
    updateData.description = validateTaskDescription(data.description);
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status)) {
      throw createError("Invalid task status", 400, "VALIDATION_ERROR");
    }

    updateData.status = data.status;
  }

  if (data.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(data.priority)) {
      throw createError("Invalid task priority", 400, "VALIDATION_ERROR");
    }

    updateData.priority = data.priority;
  }

  if (data.dueDate !== undefined) {
    updateData.dueDate = validateDueDate(data.dueDate);
  }

  if (Object.keys(updateData).length === 0) {
    throw createError("Provide at least one field to update", 400, "VALIDATION_ERROR");
  }

  return taskRepository.update(existing.id, updateData);
}

async function deleteTask(id, userId) {
  const validUserId = assertValidUserId(userId);
  const task = await requireOwnedTask(id, validUserId);
  return taskRepository.remove(task.id);
}

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
