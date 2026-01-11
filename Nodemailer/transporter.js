const nodemailer = require("nodemailer");
require("dotenv").config();

// Standard Gmail configuration for production
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // Use 587 for STARTTLS (more reliable on cloud hosts like Render)
    secure: false, // false for port 587
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD, // Use a Gmail App Password, NOT your regular password
    },
    tls: {
        rejectUnauthorized: false // Helps prevent connection drops on some networks
    },
    connectionTimeout: 10000, // 10 seconds connection timeout
    greetingTimeout: 10000,   // 10 seconds greeting timeout
    socketTimeout: 10000      // 10 seconds socket timeout
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.log("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to send emails");
    }
});

module.exports = transporter;