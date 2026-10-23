
const prisma = require("../lib/prisma");

async function create(data) {
  return prisma.project.create({
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
}

async function findAll(ownerId) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
}

async function findById(id) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
}

async function update(id, data) {
  return prisma.project.update({
    where: { id },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
}

async function remove(id) {
  return prisma.project.delete({
    where: { id },
  });
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove,
};
