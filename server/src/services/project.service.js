
const projectRepository = require("../repositories/project.repository");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function createProject(data, userId) {
  if (
    !data ||
    typeof data.name !== "string" ||
    !data.name.trim()
  ) {
    throw createError("Project name is required", 400);
  }

  return projectRepository.create({
    name: data.name.trim(),
    description:
      typeof data.description === "string" &&
      data.description.trim()
        ? data.description.trim()
        : null,
    ownerId: userId,
  });
}

async function getAllProjects(userId) {
  return projectRepository.findAll(userId);
}

async function getProjectById(id, userId) {
  const project = await projectRepository.findById(id);

  if (!project || project.ownerId !== userId) {
    throw createError("Project not found", 404);
  }

  return project;
}

async function updateProject(id, data, userId) {
  const existing = await getProjectById(id, userId);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createError("Request body must be an object", 400);
  }

  const updateData = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw createError("Project name cannot be empty", 400);
    }

    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) {
    if (
      data.description !== null &&
      typeof data.description !== "string"
    ) {
      throw createError("Description must be a string or null", 400);
    }

    updateData.description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : null;
  }

  if (Object.keys(updateData).length === 0) {
    throw createError("Provide at least one field to update", 400);
  }

  return projectRepository.update(existing.id, updateData);
}

async function deleteProject(id, userId) {
  const project = await getProjectById(id, userId);
  return projectRepository.remove(project.id);
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
