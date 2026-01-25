const express = require("express");
const router = express.Router();
const trustScoreController = require("../Controllers/trustScoreController");
const { authMiddleWere } = require("../middleWere/authMiddlewere");

// Public routes
router.get("/health", trustScoreController.getAIServiceHealth);
router.get("/credentials", trustScoreController.getAvailableCredentials);
router.get("/metrics", trustScoreController.getModelMetrics);

// Protected routes
router.get('/credentials/supported', authMiddleWere, trustScoreController.getSupportedCredentials);
router.post("/predict", authMiddleWere, trustScoreController.predictTrustScore);
router.post("/predict/batch", authMiddleWere, trustScoreController.predictTrustScoreBatch);
router.get("/vetted-pros", authMiddleWere, trustScoreController.getVettedProfessionals);

module.exports = router;