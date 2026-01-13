const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const dbConnection = require("./Dbconnection/dbConfig.js")
const authRouter = require("./Routes/authRoute.js")
const trustScoreRouter = require("./Routes/trustScoreRoute.js")
const profileRouter = require("./Routes/profileRoute.js")
const claimsRouter = require("./Routes/claimsRoute.js")
require("dotenv").config()
const app = express()

// Initialize database connection
dbConnection()

// CORS configuration for Huawei Cloud and multiple environments
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'https://fudmatechteam1.github.io',
    'https://techtrust-backend.onrender.com',
    // Add Huawei Cloud domains if needed
    process.env.FRONTEND_URL,
    process.env.HUAWEI_CLOUD_FRONTEND_URL
].filter(Boolean) // Remove undefined values

app.use(cookieParser()) 
app.use(express.json({ limit: '10mb' })) // Increase limit for large payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Enhanced CORS configuration for Huawei Cloud deployment
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true)
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            // In production, log but allow Huawei Cloud domains
            if (process.env.NODE_ENV === 'production') {
                // Allow Huawei Cloud domains pattern
                if (origin.includes('.huaweicloud.com') || origin.includes('.huaweicloudapp.com')) {
                    return callback(null, true)
                }
            }
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
}))

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    })
})

// API Routes
app.use("/api/auth", authRouter)
app.use("/api/trust-score", trustScoreRouter)
app.use("/api/profile", profileRouter)
app.use("/api/claims", claimsRouter)

// Root endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "TechTrust Backend API",
        version: "1.0.0",
        endpoints: {
            health: "/health",
            auth: "/api/auth",
            trustScore: "/api/trust-score"
        }
    })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        message: 'Route not found',
        path: req.path,
        method: req.method
    })
})

// Enhanced error handler for production
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    })
    
    // Handle CORS errors
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ 
            message: 'CORS policy violation',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Request not allowed'
        })
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            message: 'Validation Error',
            error: err.message
        })
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
            message: 'Authentication Error',
            error: 'Invalid or expired token'
        })
    }
    
    // Default error response
    res.status(err.status || 500).json({ 
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    })
})

const port = process.env.PORT || 4000
const host = process.env.HOST || '0.0.0.0' // Listen on all interfaces for Huawei Cloud

app.listen(port, host, () => {
    console.log(`🚀 Server is running on http://${host}:${port}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`)
})