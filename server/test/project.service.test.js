
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const projectService = require("../src/services/project.service");
const projectRepository = require("../src/repositories/project.repository");

describe("Project Service - Authorization & Validation", () => {
  it("CRITICAL: rejects unauthenticated userId (undefined, null, empty) with 401", async () => {
    const invalidUserIds = [undefined, null, "", "   ", 12345];

    for (const userId of invalidUserIds) {
      await assert.rejects(
        () => projectService.getAllProjects(userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, "UNAUTHORIZED");
          return true;
        }
      );

      await assert.rejects(
        () => projectService.createProject({ name: "My Project" }, userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );

      await assert.rejects(
        () => projectService.getProjectById("proj_1", userId),
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    }
  });

  it("rejects project creation without name or with empty name", async () => {
    await assert.rejects(
      () => projectService.createProject({ name: "" }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /project name is required/i);
        return true;
      }
    );

    await assert.rejects(
      () => projectService.createProject({ name: "   " }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it("rejects project names exceeding 100 characters", async () => {
    const longName = "P".repeat(101);
    await assert.rejects(
      () => projectService.createProject({ name: longName }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /cannot exceed 100 characters/i);
        return true;
      }
    );
  });

  it("rejects invalid description types with 400", async () => {
    const invalidDescriptions = [123, true, { text: "invalid" }, ["desc"]];

    for (const description of invalidDescriptions) {
      await assert.rejects(
        () => projectService.createProject({ name: "Valid Name", description }, "usr_valid"),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /description must be a string or null/i);
          return true;
        }
      );
    }
  });

  it("rejects descriptions exceeding 2000 characters", async () => {
    const longDesc = "D".repeat(2001);
    await assert.rejects(
      () => projectService.createProject({ name: "Valid Name", description: longDesc }, "usr_valid"),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /cannot exceed 2000 characters/i);
        return true;
      }
    );
  });

  it("IDOR PREVENTION: rejects accessing another user's project with 404", async () => {
    const origFindById = projectRepository.findById;
    projectRepository.findById = async (id) => ({
      id,
      name: "User A Private Project",
      ownerId: "usr_user_a",
    });

    try {
      // User B tries to access User A's project
      await assert.rejects(
        () => projectService.getProjectById("proj_a", "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          assert.match(err.message, /project not found/i);
          return true;
        }
      );

      // User B tries to update User A's project
      await assert.rejects(
        () => projectService.updateProject("proj_a", { name: "Hijacked" }, "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          return true;
        }
      );

      // User B tries to delete User A's project
      await assert.rejects(
        () => projectService.deleteProject("proj_a", "usr_user_b"),
        (err) => {
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    } finally {
      projectRepository.findById = origFindById;
    }
  });

  it("MASS ASSIGNMENT PREVENTION: prevents overwriting ownerId or id via update", async () => {
    const origFindById = projectRepository.findById;
    const origUpdate = projectRepository.update;
    let passedUpdateData = null;

    projectRepository.findById = async (id) => ({
      id,
      name: "Original Name",
      ownerId: "usr_owner",
    });

    projectRepository.update = async (id, data) => {
      passedUpdateData = data;
      return { id, ...data };
    };

    try {
      await projectService.updateProject(
        "proj_1",
        {
          name: "Updated Name",
          ownerId: "attacker_id",
          id: "fake_id",
          createdAt: new Date(),
        },
        "usr_owner"
      );

      assert.equal(passedUpdateData.name, "Updated Name");
      assert.equal(passedUpdateData.ownerId, undefined);
      assert.equal(passedUpdateData.id, undefined);
      assert.equal(passedUpdateData.createdAt, undefined);
    } finally {
      projectRepository.findById = origFindById;
      projectRepository.update = origUpdate;
    }
  });
});
