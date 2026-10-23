
const { DATABASE_URL } = require("../config/env");

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from server/.env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
