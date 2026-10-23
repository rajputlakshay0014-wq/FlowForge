
require("./config/env");

const prisma = require("./lib/prisma");

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "lakshay.test@flowforge.local",
    },
    update: {},
    create: {
      name: "FlowForge Test User",
      email: "lakshay.test@flowforge.local",
      passwordHash: "DEMO_ONLY_NOT_A_REAL_PASSWORD_HASH",
    },
  });

  console.log("Test user ready!");
  console.log("User ID:", user.id);
  console.log("Email:", user.email);
}

main()
  .catch((error) => {
    console.error("Could not create test user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
