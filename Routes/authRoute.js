const express = require("express");
const { 
    register, 
    login, 
    logout, 
    getAll, 
    sendVerifyOtp, 
    verifyAccount, 
    sendResetOtp, 
    resetPassword 
} = require("../Controllers/authController.js");
const { authMiddleWere } = require("../middleWere/authMiddlewere.js");

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout); // Logout can be public or protected depending on preference
router.get("/fetch", getAll);

// FIXED: Removed authMiddleWere to allow public verification
router.post("/sendOtp", sendVerifyOtp);
router.post("/verify", verifyAccount);

// FIXED: Removed authMiddleWere and confirmed function reference for reset flow
router.post("/sendResetOtp", sendResetOtp); 
router.post("/resetPassword", resetPassword);

module.exports = router;