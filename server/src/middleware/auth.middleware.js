
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required",
      },
    });
  }

  const parts = authHeader.split(" ");
  const token = parts[1];

  if (!token || !token.trim()) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required",
      },
    });
  }

  const secret = JWT_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Server authentication is not configured",
      },
    });
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.sub !== "string" ||
      !decoded.sub.trim()
    ) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Authentication token is invalid or malformed",
        },
      });
    }

    req.user = {
      id: decoded.sub.trim(),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Authentication token is invalid or expired",
      },
    });
  }
}

module.exports = authenticateToken;
