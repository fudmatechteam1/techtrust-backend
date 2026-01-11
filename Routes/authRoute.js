const express = require("express")
const { register, login, logout, getAll, sendVerifyOtp, verifyAccount, sendResetOtp, resetPassword } = require("../Controllers/authController.js")
const { authMiddleWere } = require("../middleWere/authMiddlewere.js")
const router = express.Router()

router.post("/register",register)
router.post("/login",login)
router.post("/logout",logout)
router.get("/fetch",getAll)

// FIXED: Removed authMiddleWere (User is not logged in yet)
router.post("/sendOtp", sendVerifyOtp)
router.post("/verify", verifyAccount)

// FIXED: Removed authController. prefix and authMiddleWere
router.post("/sendResetOtp", sendResetOtp)
router.post("/resetPassword", resetPassword)

module.exports = router