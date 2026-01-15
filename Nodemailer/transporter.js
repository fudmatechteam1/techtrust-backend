const axios = require("axios");
require("dotenv").config();

// Replaced Nodemailer SMTP with Axios API call to bypass Render port blocking
const transporter = {
    // We keep the method name 'sendMail' to match your authController calls
    sendMail: async function (mailOptions) {
        
        // 1. Verify API Key
        if (!process.env.BREVO_API_KEY) {
            console.error("❌ BREVO_API_KEY is missing in .env file.");
            throw new Error("Email service not configured (Missing API Key).");
        }

        // 2. Prepare data for Brevo API (v3)
        // We map mailOptions.text (used in your controller) to textContent
        const emailData = {
            sender: {
                // Ensure SENDER_EMAIL matches the email verified in Brevo
                name: "Tech Trust",
                email: process.env.SENDER_EMAIL || "no-reply@techtrust.com"
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            textContent: mailOptions.text, // Mapping 'text' from controller
            htmlContent: mailOptions.html || `<p>${mailOptions.text}</p>` // Fallback HTML
        };

        try {
            // 3. Send via HTTP (Port 443 - Works on Render)
            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                emailData,
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    }
                }
            );
            console.log("✅ Email sent successfully via Brevo API:", response.data);
            return response.data;
        } catch (error) {
            // Enhanced error logging
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error("❌ API Email Error:", errorMsg);
            throw new Error(`Email API failed: ${errorMsg}`);
        }
    }
};

module.exports = transporter;