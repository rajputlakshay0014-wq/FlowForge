
const prisma = require("../lib/prisma");

async function create(data) {
  return prisma.task.create({
    data,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assignments: true,
          comments: true,
        },
      },
    },
  });
}

async function findAll(filters = {}) {
  return prisma.task.findMany({
    where: filters,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assignments: true,
          comments: true,
        },
      },
    },
  });
}

async function findById(id) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      comments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

async function update(id, data) {
  return prisma.task.update({
    where: { id },
    data,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assignments: true,
          comments: true,
        },
      },
    },
  });
}

async function remove(id) {
  return prisma.task.delete({
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
