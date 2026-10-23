
require("./config/env");

const prisma = require("./lib/prisma");

async function main() {
  await prisma.$connect();

  const result = await prisma.user.count();

  console.log("Database connected successfully!");
  console.log("Users currently in database:", result);
}

main()
  .catch((error) => {
    console.error("Database connection failed:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
