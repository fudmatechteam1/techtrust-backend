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
    connectionTimeout: 20000, // 20 seconds connection timeout (increased for Render)
    greetingTimeout: 15000,   // 15 seconds greeting timeout
    socketTimeout: 15000      // 15 seconds socket timeout
});

// Verify connection configuration on startup (non-blocking)
// This runs in the background and won't block server startup
transporter.verify((error, success) => {
    if (error) {
        console.log("⚠ SMTP Connection Warning:", error.message);
        console.log("   Email functionality may not work until SMTP is configured correctly.");
        console.log("   Check SENDER_EMAIL and SENDER_PASSWORD environment variables.");
    } else {
        console.log("✓ SMTP Server is ready to send emails");
    }
});

module.exports = transporter;