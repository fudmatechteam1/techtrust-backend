const axios = require('axios');
require("dotenv").config();

const transporter = {
    sendMail: async function (mailOptions) {
        
        // 1. Check API Key
        if (!process.env.BREVO_API_KEY) {
            console.error("❌ BREVO_API_KEY is missing in Environment Variables");
            throw new Error("Email configuration missing (API Key).");
        }

        // 2. Check Sender Email (This is where your error is coming from!)
        if (!process.env.SENDER_EMAIL) {
            console.error("❌ SENDER_EMAIL is missing in Environment Variables");
            throw new Error("Email configuration missing (Sender Email).");
        }

        const data = {
            sender: {
                name: "Tech Trust",
                email: process.env.SENDER_EMAIL.trim() // .trim() removes accidental spaces
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            htmlContent: mailOptions.html || `<p>${mailOptions.text}</p>`
        };

        try {
            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                data,
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY.trim(), // Safe trim here too
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    }
                }
            );
            console.log("✅ Email sent successfully via Brevo API");
            return response.data;
        } catch (error) {
            // Enhanced logging to see exactly what Brevo said
            const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error("❌ API Email Error:", errorDetails);
            throw new Error(`Email Service Failed: ${errorDetails}`);
        }
    }
};

module.exports = transporter;