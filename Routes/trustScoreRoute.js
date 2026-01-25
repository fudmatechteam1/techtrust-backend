const express = require("express");
const router = express.Router();
const trustScoreController = require("../Controllers/trustScoreController");
const { authMiddleWere } = require("../middleWere/authMiddlewere");

/**
 * Trust Score Routes
 */

// Public routes
router.get("/health", trustScoreController.getAIServiceHealth);
router.get("/credentials", trustScoreController.getAvailableCredentials);
router.get("/metrics", trustScoreController.getModelMetrics);
router.get('/credentials/supported', trustScoreController.getSupportedCredentials);

// Protected routes
router.post("/predict", authMiddleWere, trustScoreController.predictTrustScore);
router.post("/predict/batch", authMiddleWere, trustScoreController.predictTrustScoreBatch);

// Added route for the Recruiter Dashboard to fetch names correctly
router.get("/vetted-pros", authMiddleWere, trustScoreController.getVettedProfessionals);

module.exports = router;