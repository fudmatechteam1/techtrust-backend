const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const dbConnection = require("./Dbconnection/dbConfig.js")
const router = require("./Routes/authRoute.js")
require("dotenv").config()
const app = express()

dbConnection()

// FIXED: Removed the space and the subpath from the URL
const URLs = [
    'http://localhost:5173',
    'https://fudmatechteam1.github.io'
]

app.use(cookieParser()) 
app.use(express.json())

// FIXED: Improved CORS matching logic
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || URLs.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}))

const port = process.env.PORT || 4000

app.use("/api/auth", router)

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`)
})