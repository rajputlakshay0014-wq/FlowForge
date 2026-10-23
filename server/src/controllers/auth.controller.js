
const authService = require("../services/auth.service");

async function signup(req, res) {
  try {
    const result = await authService.signup(req.body || {});

    // Support either a user-only result or a result containing a token.
    const token = result?.token || result?.accessToken;
    const user = result?.user || result;

    return res.status(201).json({
      message: "User registered successfully",
      user,
      ...(token ? { token } : {}),
    });
  } catch (error) {
    const isDuplicate = error.statusCode === 409 || error.code === "P2002" || error.code === "EMAIL_ALREADY_EXISTS";
    const statusCode = isDuplicate ? 409 : (error.statusCode || 500);

    return res.status(statusCode).json({
      error: {
        code:
          statusCode === 400
            ? (error.code || "VALIDATION_ERROR")
            : isDuplicate
              ? "EMAIL_ALREADY_EXISTS"
              : "INTERNAL_SERVER_ERROR",
        message:
          statusCode >= 500
            ? "Something went wrong"
            : error.message,
      },
    });
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body || {});

    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      error: {
        code:
          statusCode === 400
            ? (error.code || "VALIDATION_ERROR")
            : statusCode === 401
              ? (error.code || "INVALID_CREDENTIALS")
              : "INTERNAL_SERVER_ERROR",
        message:
          statusCode >= 500
            ? "Something went wrong"
            : error.message,
      },
    });
  }
}

async function getMe(req, res) {
  try {
    const user = await authService.getCurrentUser(req.user?.id);

    return res.status(200).json({
      message: "Authenticated successfully",
      userId: user.id,
      user,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      error: {
        code:
          statusCode === 401
            ? "UNAUTHORIZED"
            : statusCode === 404
              ? "NOT_FOUND"
              : "INTERNAL_SERVER_ERROR",
        message:
          statusCode >= 500
            ? "Something went wrong"
            : error.message,
      },
    });
  }
}

module.exports = { signup, login, getMe };
