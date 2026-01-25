const express = require("express");
const {
    predictTrustScore,
    predictTrustScoreBatch,
    getAvailableCredentials,
    getAIServiceHealth,
    getModelMetrics
} = require("../Controllers/trustScoreController.js");
const { authMiddleWere } = require("../middleWere/authMiddlewere.js");

const router = express.Router();

/**
 * Trust Score Routes
 * 
 * These routes connect the Node.js backend to the Python AI service
 * for trust score predictions and related operations.
 */

// Public routes (no authentication required)
router.get("/health", getAIServiceHealth);
router.get("/credentials/supported",trustScoreController.getAvailableCredentials);
router.get("/metrics", getModelMetrics);

// Protected routes (authentication required)
// Uncomment authMiddleWere if you want to protect these endpoints
router.post("/predict", /* authMiddleWere, */ predictTrustScore);
router.post("/predict/batch", /* authMiddleWere, */ predictTrustScoreBatch);

module.exports = router;
