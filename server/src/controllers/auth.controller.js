
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
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      error: {
        code:
          statusCode === 400
            ? "VALIDATION_ERROR"
            : statusCode === 409
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
            ? "VALIDATION_ERROR"
            : statusCode === 401
              ? "INVALID_CREDENTIALS"
              : "INTERNAL_SERVER_ERROR",
        message:
          statusCode >= 500
            ? "Something went wrong"
            : error.message,
      },
    });
  }
}

module.exports = { signup, login };
