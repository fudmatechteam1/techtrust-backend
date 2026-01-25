const axios = require('axios');
const Profile = require('../Models/Profile');
const User = require('../Models/User');
const Vetting = require('../Models/vettingResult');
// Configure AI Service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';
const aiServiceClient = axios.create({ baseURL: AI_SERVICE_URL, timeout: 30000, headers: { 'Content-Type': 'application/json' } });

// --- FUNCTION 1: PREDICT SCORE ---
const predictTrustScore = async (req, res) => {
    try {
        const { username, credentials } = req.body;
        if (!username) return res.status(400).json({ success: false, message: "GitHub username is required" });

        const user = await User.findOne({ githubUsername: username });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        
        const profile = await Profile.findOne({ user: user._id });
        const payload = {
            username: username,
            full_name: user.name || username,
            bio: profile?.bio || "",
            location: profile?.location || "",
            email: user.email || "",
            hireable: profile?.hireable || false,
            public_repos: profile?.publicRepos || 0,
            followers: profile?.followers || 0,
            following: profile?.following || 0,
            account_age_days: profile?.accountAgeDays || 0,
            total_stars: profile?.totalStars || 0,
            total_forks: profile?.totalForks || 0,
            languages: profile?.skillsArray ? profile.skillsArray.split(',').map(s => s.trim()) : [],
            credentials: credentials || []
        };
        const aiResponse = await aiServiceClient.post('/api/v1/predict', payload);
        const prediction = aiResponse.data;
        if (profile) {
            profile.currentTrustScore = prediction.trust_score;
            profile.trustScoreHistory.push({ score: prediction.trust_score, date: new Date(), reason: "Manual verification update" });
            await profile.save();
        }
        return res.status(200).json({ success: true, data: prediction });
    } catch (error) {
        console.error("Trust Score Error:", error.message);
        const status = error.code === 'ECONNREFUSED' ? 503 : 500;
        const msg = error.code === 'ECONNREFUSED' ? "AI Service unavailable" : error.message;
        return res.status(status).json({ success: false, message: msg });
    }
};

// --- FUNCTION 2: GET CREDENTIALS ---
const getSupportedCredentials = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/credentials');
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Error fetching credentials:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch supported credentials from AI service" });
    }
};

// --- FUNCTION 3: GET AI SERVICE HEALTH ---
const getAIServiceHealth = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/health');
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("AI Service Health Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch AI service health" });
    }
};

// --- FUNCTION 4: GET AVAILABLE CREDENTIALS ---
const getAvailableCredentials = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/credentials');
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Available Credentials Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch available credentials" });
    }
};

// --- FUNCTION 5: GET MODEL METRICS ---
const getModelMetrics = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/metrics');
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Model Metrics Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch model metrics" });
    }
};

// --- FUNCTION 6: PREDICT TRUST SCORE BATCH ---
const predictTrustScoreBatch = async (req, res) => {
    try {
        const { developers } = req.body;
        if (!Array.isArray(developers) || developers.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid request', error: 'Please provide an array of developer profiles' });
        }
        const aiResponse = await aiServiceClient.post('/api/v1/predict/batch', { developers });
        return res.status(200).json({ success: true, data: aiResponse.data });
    } catch (error) {
        console.error("Batch Trust Score Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to predict batch trust scores" });
    }
};

// --- FUNCTION 7: GET VETTED PROFESSIONALS ---
const getVettedProfessionals = async (req, res) => {
    try {
        const results = await Vetting.find().populate('user', 'name email').sort({ score: -1 });
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- EXPORTS (CRITICAL) ---
module.exports = {
    predictTrustScore,
    getSupportedCredentials,
    getAIServiceHealth,
    getAvailableCredentials,
    getModelMetrics,
    predictTrustScoreBatch,
    getVettedProfessionals
};