const jwt = require("jsonwebtoken");

exports.authMiddleWere = async (req, res, next) => {
    // 1. Try to get token from Header (New) OR Cookie (Original)
    let token = req.cookies?.token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(400).json({ message: "Not Authorize token" });
    }

    try {
        // Using JWT_SCRET as per your original file spelling
        const decoded = jwt.verify(token, process.env.JWT_SCRET || process.env.JWT_SECRET);
        
        if (decoded.id) {
            req.user = { id: decoded.id };
            req.body.userId = decoded.id; 
        } else {
            return res.status(400).json({ message: "Not Authorize login" });
        }
        next();
    } catch (error) {
        console.log("Auth Error:", error.message);
        return res.status(400).json({ message: error.message });
    }
};

