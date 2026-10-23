
const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/me", authenticateToken, authController.getMe);

module.exports = router;
