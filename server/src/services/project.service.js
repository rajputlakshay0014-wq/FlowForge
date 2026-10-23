
const projectRepository = require("../repositories/project.repository");

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

function validateProjectName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw createError("Project name is required", 400, "VALIDATION_ERROR");
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw createError("Project name cannot exceed 100 characters", 400, "VALIDATION_ERROR");
  }
  return trimmed;
}

function validateProjectDescription(description) {
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

async function createProject(data, userId) {
  const validUserId = assertValidUserId(userId);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400, "VALIDATION_ERROR");
  }

  const name = validateProjectName(data.name);
  const description = validateProjectDescription(data.description);

  return projectRepository.create({
    name,
    description,
    ownerId: validUserId,
  });
}

async function getAllProjects(userId) {
  const validUserId = assertValidUserId(userId);
  return projectRepository.findAll(validUserId);
}

async function getProjectById(id, userId) {
  const validUserId = assertValidUserId(userId);

  if (!id || typeof id !== "string" || !id.trim()) {
    throw createError("Project not found", 404, "NOT_FOUND");
  }

  const project = await projectRepository.findById(id.trim());

  if (!project || project.ownerId !== validUserId) {
    throw createError("Project not found", 404, "NOT_FOUND");
  }

  return project;
}

async function updateProject(id, data, userId) {
  const validUserId = assertValidUserId(userId);
  const existing = await getProjectById(id, validUserId);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400, "VALIDATION_ERROR");
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.name = validateProjectName(data.name);
  }

  if (data.description !== undefined) {
    updateData.description = validateProjectDescription(data.description);
  }

  if (Object.keys(updateData).length === 0) {
    throw createError("Provide at least one field to update", 400, "VALIDATION_ERROR");
  }

  return projectRepository.update(existing.id, updateData);
}

async function deleteProject(id, userId) {
  const validUserId = assertValidUserId(userId);
  const project = await getProjectById(id, validUserId);
  return projectRepository.remove(project.id);
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
