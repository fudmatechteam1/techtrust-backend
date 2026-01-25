const jwt = require("jsonwebtoken");

exports.authMiddleWere = async (req, res, next) => {
    // 1. Try to get token from Cookies first
    let token = req.cookies?.token;

    // 2. If not in cookies, check the Authorization Header
    if (!token && req.headers.authorization) {
        if (req.headers.authorization.startsWith("Bearer ")) {
            // Remove the "Bearer " prefix to get just the code
            token = req.headers.authorization.split(" ")[1];
        } else {
            // If it's just the raw token in the header
            token = req.headers.authorization;
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not Authorize token" });
    }

    try {
        // Verify using your specific env key: JWT_SCRET
        const decoded = jwt.verify(token, process.env.JWT_SCRET || process.env.JWT_SECRET);
        
        if (decoded && decoded.id) {
            req.user = { id: decoded.id };
            req.body.userId = decoded.id; // Support for controller logic
            next();
        } else {
            return res.status(401).json({ success: false, message: "Not Authorize login" });
        }
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({ success: false, message: "Invalid or Malformed Token" });
    }
};