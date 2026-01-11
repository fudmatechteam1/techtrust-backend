const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const dbConnection = require("./Dbconnection/dbConfig.js")
const router = require("./Routes/authRoute.js")
require("dotenv").config()
const app = express()

dbConnection()

// FIXED: Cleaned up the array and ensured no trailing slashes or spaces
const URLs = [
    'http://localhost:5173',
    'https://fudmatechteam1.github.io',
    'http://127.0.0.1:5500' //This is for my local host
]

app.use(cookieParser()) 
app.use(express.json())

// FIXED: Simplified CORS to prevent server-side crashes (500 errors)
app.use(cors({
    origin: function (origin, callback) {
        // If origin is in the list or if there's no origin (server-to-server/testing)
        if (!origin || URLs.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

const port = process.env.PORT || 4000

app.use("/api/auth", router)

// Basic error handler to prevent the whole app from crashing and returning 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`)
})