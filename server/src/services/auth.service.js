
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { JWT_SECRET } = require("../config/env");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function createToken(userId) {
  const secret = JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { sub: userId },
    secret,
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

function validateEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw createError("Email address is required", 400, "VALIDATION_ERROR");
  }
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
    throw createError("Please enter a valid email address", 400, "VALIDATION_ERROR");
  }
  return trimmed;
}

function validatePassword(password, isSignup = true) {
  if (typeof password !== "string" || !password) {
    throw createError("Password is required", 400, "VALIDATION_ERROR");
  }
  if (isSignup && password.length < 8) {
    throw createError("Password must be at least 8 characters long", 400, "VALIDATION_ERROR");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw createError("Password cannot exceed 72 bytes", 400, "VALIDATION_ERROR");
  }
}

function validateName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw createError("Name is required", 400, "VALIDATION_ERROR");
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw createError("Name cannot exceed 100 characters", 400, "VALIDATION_ERROR");
  }
  return trimmed;
}

async function signup({ name, email, password }) {
  const validatedName = validateName(name);
  const normalizedEmail = validateEmail(email);
  validatePassword(password, true);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createError("Email is already registered. Please sign in.", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: validatedName,
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
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("Email is already registered. Please sign in.", 409, "EMAIL_ALREADY_EXISTS");
    }
    throw error;
  }
}

async function login({ email, password }) {
  const normalizedEmail = validateEmail(email);
  validatePassword(password, false);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (
    !user ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    throw createError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = createToken(user.id);

  return {
    user: safeUser(user),
    token,
  };
}

async function getCurrentUser(userId) {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw createError("User authentication required", 401, "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId.trim() },
  });

  if (!user) {
    throw createError("User account not found", 404, "NOT_FOUND");
  }

  return safeUser(user);
}

module.exports = { signup, login, getCurrentUser };
