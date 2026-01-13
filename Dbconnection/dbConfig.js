require("dotenv").config();
const mongoose = require("mongoose")

/**
 * Database connection configuration for Huawei Cloud
 * Supports both MongoDB Atlas and Huawei Cloud DDS (Document Database Service)
 */
const dbConnection = async () => {
    try {
        // Get connection string from environment variable
        let mongoUri = process.env.MONGO_URI || process.env.DDS_URI
        
        if (!mongoUri) {
            throw new Error("MONGO_URI or DDS_URI environment variable is not set")
        }

        // Remove any invalid options from connection string that might cause errors
        // These options should be set via mongoose.set() or connectionOptions, not in URI
        const invalidUriOptions = [
            'buffermaxentries',
            'bufferMaxEntries',
            'buffercommands',
            'bufferCommands'
        ];
        
        invalidUriOptions.forEach(option => {
            // Remove option from query string if present
            const regex = new RegExp(`[&?]${option}=[^&]*`, 'gi');
            mongoUri = mongoUri.replace(regex, '');
        });

        // Connection options optimized for Huawei Cloud and production environments
        const connectionOptions = {
            // Connection pool settings
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
            
            // Timeout settings
            serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
            socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
            connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Heartbeat settings for connection health
            heartbeatFrequencyMS: 10000,
            
            // Additional options for Huawei Cloud DDS compatibility
            ...(process.env.DB_SSL === 'true' && {
                ssl: true,
                sslValidate: process.env.DB_SSL_VALIDATE !== 'false'
            }),
            
            // Authentication options
            authSource: process.env.DB_AUTH_SOURCE || 'admin',
        }

        // Configure Mongoose buffering separately (not in connection options)
        mongoose.set('bufferCommands', false);
        mongoose.set('bufferMaxEntries', 0);

        // Connect to database
        await mongoose.connect(mongoUri, connectionOptions)
        
        console.log("✅ Database connected successfully")
        console.log(`📊 Database: ${mongoose.connection.name}`)
        console.log(`🔗 Host: ${mongoose.connection.host}`)
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message)
        })
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...')
        })
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected successfully')
        })
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close()
            console.log('📴 MongoDB connection closed due to application termination')
            process.exit(0)
        })
        
    } catch (error) {
        console.error("❌ Database connection failed:")
        console.error(`   Error: ${error.message}`)
        console.error(`   URI: ${process.env.MONGO_URI ? 'MONGO_URI is set' : 'MONGO_URI is NOT set'}`)
        
        // In production, exit process to allow container orchestration to restart
        if (process.env.NODE_ENV === 'production') {
            console.error("   Exiting process in production mode...")
            process.exit(1)
        } else {
            // In development, throw error but don't exit immediately
            throw error
        }
    }
}

module.exports = dbConnection