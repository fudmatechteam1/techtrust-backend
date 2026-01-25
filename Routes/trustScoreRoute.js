const express = require("express");
const {
    predictTrustScore,
    predictTrustScoreBatch,
    getAvailableCredentials,
    getAIServiceHealth,
    getModelMetrics,
    getVettedProfessionals, // 1. Added this import
    getSupportedCredentials // <-- Add import
} = require("../Controllers/trustScoreController.js");
const { authMiddleWere } = require("../middleWere/authMiddlewere.js");

const router = express.Router();

/**
 * Trust Score Routes
 */

// Public routes
router.get("/health", getAIServiceHealth);
router.get("/credentials", getAvailableCredentials);
router.get("/metrics", getModelMetrics);

// Protected routes
// 2. Enabled authMiddleWere so the controller can get req.user.id to prevent duplicates
router.post("/predict", authMiddleWere, predictTrustScore); 
router.post("/predict/batch", authMiddleWere, predictTrustScoreBatch);

// 3. Added route for the Recruiter Dashboard to fetch names correctly
router.get("/vetted-pros", authMiddleWere, getVettedProfessionals);

// Added route for supported credentials
router.get('/credentials/supported', authMiddleWere, getSupportedCredentials);

module.exports = router;