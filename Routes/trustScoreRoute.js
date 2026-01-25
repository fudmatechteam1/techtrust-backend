const express = require("express");
const router = express.Router();
const trustScoreController = require("../Controllers/trustScoreController");
const authMiddleWare = require("../middleWere/authMiddlewere");

/**
 * Trust Score Routes
 */

// Public routes
router.get("/health", trustScoreController.getAIServiceHealth);
router.get("/credentials", trustScoreController.getAvailableCredentials);
router.get("/metrics", trustScoreController.getModelMetrics);
router.get('/credentials/supported', trustScoreController.getSupportedCredentials);

// Protected routes
router.post("/predict", authMiddleWare, trustScoreController.predictTrustScore);
router.post("/predict/batch", authMiddleWare, trustScoreController.predictTrustScoreBatch);

// Added route for the Recruiter Dashboard to fetch names correctly
router.get("/vetted-pros", authMiddleWare, trustScoreController.getVettedProfessionals);

module.exports = router;