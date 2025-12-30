const express = require("express")
const { register, login, logout, getAll, sendVerifyOtp, verifyAccount, sendResetOtp, resetPassword } = require("../Controllers/authController.js")
const { authMiddleWere } = require("../middleWere/authMiddlewere.js")
const router = express.Router()

router.post("/register",register)
router.post("/login",login)
router.post("/logout",logout)
router.get("/fetch",getAll)
router.post("/sendOtp",authMiddleWere,sendVerifyOtp)
router.post("/verify",authMiddleWere,verifyAccount)
router.post("/sendResetOtp",authMiddleWere,sendResetOtp)
router.post("/resetPassword",authMiddleWere,resetPassword)

module.exports = router