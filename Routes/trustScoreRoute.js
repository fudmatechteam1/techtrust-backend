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
router.get('/credentials/supported', authMiddleWere, trustScoreController.getSupportedCredentials);

// Protected routes
router.post("/predict", authMiddleWere, trustScoreController.predictTrustScore);
router.post("/predict/batch", authMiddleWere, trustScoreController.predictTrustScoreBatch);

// Added route for the Recruiter Dashboard to fetch names correctly
router.get("/vetted-pros", authMiddleWere, trustScoreController.getVettedProfessionals);

// Example of making a fetch request to the predict endpoint
const token = localStorage.getItem('token'); // or wherever you store it

axios.post(
  'https://techtrust-backend.onrender.com/api/trust-score/predict',
  payload,
  { headers: { Authorization: `Bearer ${token}` } }
);

module.exports = router;

exports.authMiddleWere = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No authorization token provided" });
  }
  // ...rest of your logic...
};