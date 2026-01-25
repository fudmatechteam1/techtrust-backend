const axios = require('axios');
const Profile = require('../Models/Profile');
const User = require('../Models/User');
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

// --- EXPORTS (CRITICAL) ---
module.exports = { predictTrustScore, getSupportedCredentials };