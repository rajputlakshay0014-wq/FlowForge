
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Try candidate paths in order of specificity without exposing secrets
const candidates = [
  path.resolve(__dirname, "../../.env"),      // <workspace>/server/.env
  path.resolve(__dirname, "../../../.env"),   // <workspace>/.env
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
};

module.exports = config;
