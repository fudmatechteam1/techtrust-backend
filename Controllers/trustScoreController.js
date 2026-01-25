const axios = require('axios')
const User = require('../Models/User.js')
const Profile = require('../Models/Profile.js')
const Vetting = require('../Models/vettingResult.js')


/**
 * Trust Score Controller
 * Connects Node.js backend to Python AI service (FastAPI) for trust score predictions
 */

// Get Python AI service URL from environment variables
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000 // 30 seconds

/**
 * Create axios instance with default configuration
 */
const aiServiceClient = axios.create({
    baseURL: AI_SERVICE_URL,
    timeout: AI_SERVICE_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    },
    // Retry configuration
    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
})

/**
 * Check if AI service is available
 */
const checkAIServiceHealth = async () => {
    try {
        const response = await aiServiceClient.get('/health', { timeout: 5000 })
        return response.status === 200 && response.data.status === 'healthy'
    } catch (error) {
        console.error('AI Service health check failed:', error.message)
        return false
    }
}

/**
 * Transform GitHub profile data to AI service format
 */
const transformToAIServiceFormat = (profileData) => {
    return {
        username: profileData.username || profileData.githubUsername || 'unknown',
        total_stars: profileData.totalStars || profileData.total_stars || 0,
        total_forks: profileData.totalForks || profileData.total_forks || 0,
        total_issues: profileData.totalIssues || profileData.total_issues || 0,
        total_prs: profileData.totalPRs || profileData.total_prs || 0,
        total_contributors: profileData.totalContributors || profileData.total_contributors || 0,
        languages: Array.isArray(profileData.languages) 
            ? profileData.languages 
            : (profileData.languages ? [profileData.languages] : []),
        repo_count: profileData.repoCount || profileData.repo_count || 0,
        credentials: Array.isArray(profileData.credentials) 
            ? profileData.credentials 
            : []
    }
}

/**
 * Predict trust score for a developer profile
 * POST /api/trust-score/predict
 */
exports.predictTrustScore = async (req, res) => {
    try {
        // Check if AI service is available
        const isHealthy = await checkAIServiceHealth()
        if (!isHealthy) {
            return res.status(503).json({
                success: false,
                message: 'AI service is currently unavailable',
                error: 'The trust score prediction service is not responding. Please try again later.'
            })
        }

        // Get user ID from authenticated request (if middleware is used)
        const userId = req.user?.id || req.body.userId
        

        // Validate required fields
        const { 
            username, 
            totalStars, 
            totalForks, 
            totalIssues, 
            totalPRs, 
            totalContributors, 
            languages, 
            repoCount,
            credentials = []
        } = req.body

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required',
                error: 'Please provide a GitHub username'
            })
        }

        // Prepare data for AI service
        const aiServiceData = transformToAIServiceFormat({
            username,
            totalStars,
            totalForks,
            totalIssues,
            totalPRs,
            totalContributors,
            languages: languages || [],
            repoCount: repoCount || 0,
            credentials
        })

        // Call AI service
        const response = await aiServiceClient.post('/api/v1/predict', aiServiceData)

        if (response.status !== 200) {
            return res.status(response.status).json({
                success: false,
                message: 'AI service error',
                error: response.data?.detail || response.data?.message || 'Failed to get trust score prediction'
            })
        }

        const trustScoreData = response.data

        // Sync to Database and stop duplicates
        if (userId) {
            try {
                await Vetting.findOneAndUpdate(
                    { user: userId }, 
                    {
                        user: userId,
                        score: trustScoreData.trust_score,
                        flags: trustScoreData.flags || "",
                        scoreBreakdown: JSON.stringify(trustScoreData.breakdown),
                        aiFeedback: trustScoreData.feedback || "Vetting completed successfully."
                    },
                    { upsert: true, new: true }
                );
                
                // Update main Profile score field
                await Profile.findOneAndUpdate(
                    { user: userId },
                    { currentTrustScore: trustScoreData.trust_score.toString() }
                );
            } catch (dbError) {
                console.error('Database Sync Error:', dbError.message);
            }
        }

        // Optionally save to database if user is authenticated
        // Note: Profile model may need to be updated to include these fields
        // For now, we'll skip saving to avoid schema conflicts
        // Uncomment and update Profile model schema if you want to persist trust scores
        /*
        if (userId) {
            try {
                // Update or create profile with trust score
                await Profile.findOneAndUpdate(
                    { userId: userId },
                    {
                        userId: userId,
                        currentTrustScore: trustScoreData.trust_score.toString(),
                        trustScoreData: JSON.stringify({
                            trustScore: trustScoreData.trust_score,
                            githubScore: trustScoreData.github_score,
                            credentialScore: trustScoreData.credential_score,
                            confidenceLevel: trustScoreData.confidence_level,
                            breakdown: trustScoreData.breakdown,
                            credentialsInfo: trustScoreData.credentials_info
                        }),
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                )
            } catch (dbError) {
                console.error('Failed to save trust score to database:', dbError.message)
                // Don't fail the request if DB save fails
            }
        }
        */

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Trust score calculated successfully',
            data: trustScoreData
        })

    } catch (error) {
        console.error('Predict Trust Score Error:', error)
        
        // Handle axios errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                success: false,
                message: 'AI service connection failed',
                error: 'Unable to connect to the trust score prediction service. Please try again later.'
            })
        }

        if (error.response) {
            // AI service returned an error response
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'AI service error',
                error: error.response.data?.detail || error.response.data?.message || error.message
            })
        }

        // Generic error
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to predict trust score'
        })
    }
}

/**
 * Batch predict trust scores for multiple developers
 * POST /api/trust-score/predict/batch
 */
exports.predictTrustScoreBatch = async (req, res) => {
    try {
        // Check if AI service is available
        const isHealthy = await checkAIServiceHealth()
        if (!isHealthy) {
            return res.status(503).json({
                success: false,
                message: 'AI service is currently unavailable',
                error: 'The trust score prediction service is not responding. Please try again later.'
            })
        }

        const { developers } = req.body

        if (!Array.isArray(developers) || developers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request',
                error: 'Please provide an array of developer profiles'
            })
        }

        // Limit batch size to prevent overload
        const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE) || 50
        if (developers.length > MAX_BATCH_SIZE) {
            return res.status(400).json({
                success: false,
                message: 'Batch size too large',
                error: `Maximum batch size is ${MAX_BATCH_SIZE} developers`
            })
        }

        // Transform all developers to AI service format
        const transformedDevelopers = developers.map(transformToAIServiceFormat)

        // Call AI service batch endpoint
        const response = await aiServiceClient.post('/api/v1/predict/batch', {
            developers: transformedDevelopers
        })

        if (response.status !== 200) {
            return res.status(response.status).json({
                success: false,
                message: 'AI service error',
                error: response.data?.detail || response.data?.message || 'Failed to get batch trust score predictions'
            })
        }

        res.status(200).json({
            success: true,
            message: `Trust scores calculated for ${response.data.total_processed || transformedDevelopers.length} developers`,
            data: response.data
        })

    } catch (error) {
        console.error('Batch Predict Trust Score Error:', error)
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                success: false,
                message: 'AI service connection failed',
                error: 'Unable to connect to the trust score prediction service. Please try again later.'
            })
        }

        if (error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'AI service error',
                error: error.response.data?.detail || error.response.data?.message || error.message
            })
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to predict batch trust scores'
        })
    }
}

/**
 * Get available credentials from AI service
 * GET /api/trust-score/credentials
 */
exports.getAvailableCredentials = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/credentials')

        if (response.status !== 200) {
            return res.status(response.status).json({
                success: false,
                message: 'Failed to fetch credentials',
                error: response.data?.detail || 'Unable to retrieve available credentials'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Credentials retrieved successfully',
            data: response.data
        })

    } catch (error) {
        console.error('Get Credentials Error:', error)
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                success: false,
                message: 'AI service connection failed',
                error: 'Unable to connect to the trust score prediction service'
            })
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to retrieve credentials'
        })
    }
}

/**
 * Proxy supported credentials from Python AI service
 */
const getSupportedCredentials = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/credentials');
        if (response.status === 200 && response.data) {
            return res.status(200).json(response.data);
        } else {
            return res.status(response.status).json({ error: response.data?.detail || 'Failed to fetch credentials' });
        }
    } catch (error) {
        console.error('Error fetching supported credentials:', error.message);
        return res.status(500).json({ error: 'AI service unavailable', details: error.message });
    }
};

/**
 * Get AI service health status
 * GET /api/trust-score/health
 */
exports.getAIServiceHealth = async (req, res) => {
    try {
        const isHealthy = await checkAIServiceHealth()
        
        if (isHealthy) {
            const response = await aiServiceClient.get('/health')
            res.status(200).json({
                success: true,
                message: 'AI service is healthy',
                data: response.data,
                serviceUrl: AI_SERVICE_URL
            })
        } else {
            res.status(503).json({
                success: false,
                message: 'AI service is unavailable',
                serviceUrl: AI_SERVICE_URL
            })
        }
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'AI service health check failed',
            error: error.message,
            serviceUrl: AI_SERVICE_URL
        })
    }
}

/**
 * Get model metrics from AI service
 * GET /api/trust-score/metrics
 */
exports.getModelMetrics = async (req, res) => {
    try {
        const response = await aiServiceClient.get('/api/v1/metrics')

        if (response.status !== 200) {
            return res.status(response.status).json({
                success: false,
                message: 'Failed to fetch model metrics',
                error: response.data?.detail || 'Unable to retrieve model metrics'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Model metrics retrieved successfully',
            data: response.data
        })

    } catch (error) {
        console.error('Get Model Metrics Error:', error)
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                success: false,
                message: 'AI service connection failed',
                error: 'Unable to connect to the trust score prediction service'
            })
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to retrieve model metrics'
        })
    }
}

/**
 * Get Vetted Professionals for Recruiter Dashboard
 * GET /api/trust-score/vetted-pros
 */
exports.getVettedProfessionals = async (req, res) => {
    try {
        const results = await Vetting.find()
            .populate('user', 'name email') 
            .sort({ score: -1 });

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    predictTrustScore,
    predictTrustScoreBatch,
    getAvailableCredentials,
    getSupportedCredentials,
    getAIServiceHealth,
    getModelMetrics,
    getVettedProfessionals
};