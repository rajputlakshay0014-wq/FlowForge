
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const taskService = require("../src/services/task.service");
const taskRepository = require("../src/repositories/task.repository");
const prisma = require("../src/lib/prisma");

describe("Task Service - Authorization & Validation", () => {
  it("CRITICAL: rejects unauthenticated userId (undefined, null, empty) with 401", async () => {
    const invalidUserIds = [undefined, null, "", "   ", 12345];

    for (const userId of invalidUserIds) {
      await assert.rejects(
        () => taskService.getAllTasks({}, userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, "UNAUTHORIZED");
          return true;
        }
      );

      await assert.rejects(
        () => taskService.createTask({ title: "Task", projectId: "proj_1" }, userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );

      await assert.rejects(
        () => taskService.getTaskById("task_1", userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    }
  });

  it("rejects task creation without title or with empty title", async () => {
    await assert.rejects(
      () => taskService.createTask({ title: "", projectId: "proj_1" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /task title is required/i);
        return true;
      }
    );
  });

  it("rejects task titles exceeding 200 characters", async () => {
    const longTitle = "T".repeat(201);
    await assert.rejects(
      () => taskService.createTask({ title: longTitle, projectId: "proj_1" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /cannot exceed 200 characters/i);
        return true;
      }
    );
  });

  it("rejects missing projectId", async () => {
    await assert.rejects(
      () => taskService.createTask({ title: "Valid Title", projectId: "" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /projectid is required/i);
        return true;
      }
    );
  });

  it("rejects invalid status enum values", async () => {
    await assert.rejects(
      () => taskService.createTask({ title: "Task", projectId: "proj_1", status: "INVALID_STATUS" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /invalid task status/i);
        return true;
      }
    );
  });

  it("rejects invalid priority enum values", async () => {
    await assert.rejects(
      () => taskService.createTask({ title: "Task", projectId: "proj_1", priority: "SUPER_URGENT" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /invalid task priority/i);
        return true;
      }
    );
  });

  it("rejects invalid dueDate formats", async () => {
    await assert.rejects(
      () => taskService.createTask({ title: "Task", projectId: "proj_1", dueDate: "not-a-date" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /duedate must be a valid date/i);
        return true;
      }
    );
  });

  it("CROSS-RESOURCE IDOR: rejects creating task in another user's project with 404", async () => {
    const origFindFirst = prisma.project.findFirst;
    // Simulate project not found or not owned by user
    prisma.project.findFirst = async () => null;

    try {
      await assert.rejects(
        () => taskService.createTask({ title: "Unauthorized Task", projectId: "proj_another_user" }, "usr_attacker"),
        (err) => {
          assert.equal(err.statusCode, 404);
          assert.match(err.message, /project not found/i);
          return true;
        }
      );
    } finally {
      prisma.project.findFirst = origFindFirst;
    }
  });

  it("TASK IDOR PREVENTION: rejects accessing, updating, or deleting another user's task with 404", async () => {
    const origFindById = taskRepository.findById;
    taskRepository.findById = async (id) => ({
      id,
      title: "User A Task",
      project: {
        id: "proj_a",
        ownerId: "usr_user_a",
      },
    });

    try {
      // User B attempts to view User A's task
      await assert.rejects(
        () => taskService.getTaskById("task_a", "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          assert.match(err.message, /task not found/i);
          return true;
        }
      );

      // User B attempts to update User A's task
      await assert.rejects(
        () => taskService.updateTask("task_a", { title: "Hijacked" }, "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          return true;
        }
      );

      // User B attempts to delete User A's task
      await assert.rejects(
        () => taskService.deleteTask("task_a", "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    } finally {
      taskRepository.findById = origFindById;
    }
  });

  it("MASS ASSIGNMENT PREVENTION: prevents overwriting projectId or createdById via updateTask", async () => {
    const origFindById = taskRepository.findById;
    const origUpdate = taskRepository.update;
    let passedUpdateData = null;

    taskRepository.findById = async (id) => ({
      id,
      title: "Original Title",
      project: {
        id: "proj_1",
        ownerId: "usr_owner",
      },
    });

    taskRepository.update = async (id, data) => {
      passedUpdateData = data;
      return { id, ...data };
    };

    try {
      await taskService.updateTask(
        "task_1",
        {
          title: "New Title",
          projectId: "proj_target",
          createdById: "usr_attacker",
          id: "fake_task_id",
        },
        "usr_owner"
      );

      assert.equal(passedUpdateData.title, "New Title");
      assert.equal(passedUpdateData.projectId, undefined);
      assert.equal(passedUpdateData.createdById, undefined);
      assert.equal(passedUpdateData.id, undefined);
    } finally {
      taskRepository.findById = origFindById;
      taskRepository.update = origUpdate;
    }
  });
});
