const axios = require('axios');
require("dotenv").config();

const transporter = {
    // This function mimics the nodemailer .sendMail() method so you don't have to change your controller logic too much
    sendMail: async function (mailOptions) {
        
        if (!process.env.BREVO_API_KEY) {
            console.error("❌ BREVO_API_KEY is missing in .env");
            throw new Error("Email configuration missing");
        }

        const data = {
            sender: {
                name: "Tech Trust",
                email: process.env.SENDER_EMAIL // This must be the email you verified in Brevo
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            htmlContent: mailOptions.html || `<p>${mailOptions.text}</p>` // Use the text as HTML if HTML is missing
        };

        try {
            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                data,
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    }
                }
            );
            console.log("✅ Email sent via Brevo API");
            return response.data;
        } catch (error) {
            console.error("❌ API Email Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

module.exports = transporter;