
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function signup({ name, email, password }) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    throw createError(
      "Name and email are required. Password must be at least 8 characters.",
      400
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createError("Email is already registered. Please sign in.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const token = createToken(user.id);

  return {
    user: safeUser(user),
    token,
  };
}

async function login({ email, password }) {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw createError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (
    !user ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    throw createError("Invalid email or password", 401);
  }

  const token = createToken(user.id);

  return {
    user: safeUser(user),
    token,
  };
}

module.exports = { signup, login };
