
const jwt = require("jsonwebtoken");

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

  const token = authHeader.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Server authentication is not configured",
      },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.sub,
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
