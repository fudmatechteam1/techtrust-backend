const User = require("../Models/User.js")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const transporter = require("../Nodemailer/transporter.js")

exports.register = async (req, res) => {
    const { name, email, password, userType } = req.body
    
    // 1. Basic Validation
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: "All fields are required" })
    }

    try {
        // 2. Check if user already exists
        const userExist = await User.findOne({ email })
        if (userExist) {
            return res.status(400).json({ message: "User already exists" })
        }

        // 3. Prepare User Data
        // Note: Check your User model. If it expects 'role' instead of 'userType', change it here.
        const usersCount = await User.countDocuments();
        const isAdmin = usersCount === 0;
        
        const userID = "USER-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Fixed: Ensure these fields exist in your Models/User.js file
        const user = new User({
            name,
            email,
            password: hashedPassword,
            userType: userType, // Ensure your schema uses this exact key
            userID: userID
        });

        await user.save();

        // 4. Generate Token
        const token = jwt.sign(
            { id: user._id, role: user.userType },
            process.env.JWT_SCRET || 'fallback_secret', // Use SCRET to match your env
            { expiresIn: "7d" }
        );

        // 5. Set Cookie and Respond
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Required for cross-site cookies
            sameSite: "none", // Required for GitHub Pages to Render communication
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ 
            success: true, 
            message: "Registration successful",
            user: { name: user.name, email: user.email, userType: user.userType }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        // This returns the specific validation error so you can see which field failed
        return res.status(500).json({ message: "Validation Failed", error: error.message });
    }
}


exports.login = async(req, res)=>{
    const {email, password} = req.body

    // Validation
    if(!email || !password){
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
            error: "Please provide both email and password"
        })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if(!emailRegex.test(email)){
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
            error: "Please provide a valid email address"
        })
    }

    try {
        // Find user
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user){
            // Don't reveal if user exists or not (security best practice)
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                error: "Email or password is incorrect"
            })
        }

        // Check if account is verified (optional - uncomment if you want to enforce verification)
        // if(!user.isAccountVerify){
        //     return res.status(403).json({
        //         success: false,
        //         message: "Account not verified",
        //         error: "Please verify your account before logging in"
        //     })
        // }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                error: "Email or password is incorrect"
            })
        }

        // Check JWT secret
        if(!process.env.JWT_SCRET){
            console.error("JWT_SCRET environment variable is not set")
            return res.status(500).json({
                success: false,
                message: "Server configuration error",
                error: "Authentication service is not properly configured"
            })
        }

        // Generate token
        const token = jwt.sign(
            {id: user._id, role: user.userType}, 
            process.env.JWT_SCRET,
            {expiresIn: "7d"}
        )

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: { 
                name: user.name, 
                email: user.email, 
                userType: user.userType, 
                id: user._id,
                userID: user.userID,
                isAccountVerify: user.isAccountVerify
            }
        })
    } catch (error) {
        console.error("Login Error:", error)
        
        // Handle specific errors
        if(error.name === 'MongoError' && error.code === 11000){
            return res.status(500).json({
                success: false,
                message: "Database error",
                error: "A database conflict occurred. Please try again."
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : "Failed to process login request"
        })
    }
}

exports.logout = async(req, res)=>{
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/" // Ensure cookie is cleared from all paths
        })
        
        res.status(200).json({
            success: true,
            message: "Logout successful"
        })
    } catch (error) {
        console.error("Logout Error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : "Failed to logout"
        })
    }
}

// const userType = async(req,res){

// }

exports.getAll = async(req, res)=>{
    try {
        // Optional: Add pagination
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 50
        const skip = (page - 1) * limit

        const users = await User.find()
            .select('-password -verifyOtp -resetOtp') // Exclude sensitive fields
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const total = await User.countDocuments()

        if(users.length === 0){
            return res.status(404).json({
                success: false,
                message: "No users found",
                data: []
            })
        }

        res.status(200).json({
            success: true,
            message: `Found ${users.length} user(s)`,
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("Get All Users Error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : "Failed to retrieve users"
        })
    }
}

exports.sendVerifyOtp = async(req, res)=>{
    const {email} = req.body
    
    if(!email){
        return res.status(400).json({message: "Email is required"})
    }

    try {
        // Check if email service is configured
        if(!process.env.SENDER_EMAIL || !process.env.SENDER_PASSWORD){
            console.error("Email service not configured: Missing SENDER_EMAIL or SENDER_PASSWORD")
            return res.status(503).json({message: "Email service is not configured. Please contact support."})
        }

        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message: "User not found"})
        }
        if(user.isAccountVerify){
            return res.status(400).json({message: "User Already Verified"})
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Verification Otp Code",
            text: `Your Verification Code is ${otp}, Valid for 10 minutes`
        }

        // Add timeout for email sending (15 seconds)
        const emailPromise = transporter.sendMail(mailOption)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Email sending timeout after 15 seconds")), 15000)
        )

        await Promise.race([emailPromise, timeoutPromise])

        res.status(200).json({message: "OTP Code sent successfully"})
    } catch (error) {
        console.error("SendVerifyOtp Error:", error)
        
        // Provide more specific error messages
        if(error.message && error.message.includes("timeout")){
            return res.status(504).json({message: "Email service timeout. Please try again later."})
        }
        if(error.message && error.message.includes("Invalid login")){
            return res.status(500).json({message: "Email service configuration error. Please contact support."})
        }
        if(error.code === "EAUTH"){
            return res.status(500).json({message: "Email authentication failed. Please check email credentials."})
        }
        
        res.status(500).json({message: error.message || "Failed to send OTP. Please try again later."})
    }
}

exports.verifyAccount = async(req, res)=>{
    const {email, otp} = req.body
    
    // Validation
    if(!email || !otp){
        return res.status(400).json({
            success: false,
            message: "Email and OTP are required",
            error: "Please provide both email and OTP code"
        })
    }

    // Validate OTP format (6 digits)
    if(!/^\d{6}$/.test(otp)){
        return res.status(400).json({
            success: false,
            message: "Invalid OTP format",
            error: "OTP must be a 6-digit number"
        })
    }

    try {
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found",
                error: "No account found with this email address"
            })
        }

        // Check if already verified
        if(user.isAccountVerify){
            return res.status(400).json({
                success: false,
                message: "Account already verified",
                error: "This account has already been verified"
            })
        }

        // Validate OTP
        if(!user.verifyOtp || user.verifyOtp === ""){
            return res.status(400).json({
                success: false,
                message: "No OTP found",
                error: "Please request a new OTP code"
            })
        }

        if(user.verifyOtp !== otp){
            return res.status(400).json({
                success: false,
                message: "Invalid OTP code",
                error: "The OTP code you entered is incorrect"
            })
        }

        // Check expiration
        if(!user.verifyOtpExpireAt || user.verifyOtpExpireAt < Date.now()){
            // Clear expired OTP
            user.verifyOtp = ""
            user.verifyOtpExpireAt = 0
            await user.save()
            
            return res.status(400).json({
                success: false,
                message: "OTP expired",
                error: "The OTP code has expired. Please request a new one"
            })
        }

        // Verify account
        user.verifyOtp = ""
        user.verifyOtpExpireAt = 0
        user.accountStatus = "Verified"
        user.isAccountVerify = true

        await user.save()

        res.status(200).json({
            success: true,
            message: "Account verified successfully",
            data: {
                email: user.email,
                accountStatus: user.accountStatus
            }
        })
    } catch (error) {
        console.error("Verify Account Error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : "Failed to verify account"
        })
    }
}

exports.sendResetOtp = async(req,res)=>{
    const {email} = req.body
    
    if(!email){
        return res.status(400).json({message: "Email is required"})
    }

    try {
        // Check if email service is configured
        if(!process.env.SENDER_EMAIL || !process.env.SENDER_PASSWORD){
            console.error("Email service not configured: Missing SENDER_EMAIL or SENDER_PASSWORD")
            return res.status(503).json({message: "Email service is not configured. Please contact support."})
        }

        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message: "User not found"})
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000))
        const resetOtpExpireAt = Date.now() + 10 * 60 * 1000

        user.resetOtp = otp;
        user.resetOtpExpireAt = resetOtpExpireAt

        await user.save()

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Reset Password Otp",
            text: `Your reset OTP is ${otp}, valid for 10 minutes. Use this OTP code to reset your password.`
        }

        // Add timeout for email sending (15 seconds)
        const emailPromise = transporter.sendMail(mailOption)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Email sending timeout after 15 seconds")), 15000)
        )

        await Promise.race([emailPromise, timeoutPromise])

        res.status(200).json({message: "Reset OTP sent successfully"})
    } catch (error) {
        console.error("SendResetOtp Error:", error)
        
        // Provide more specific error messages
        if(error.message && error.message.includes("timeout")){
            return res.status(504).json({message: "Email service timeout. Please try again later."})
        }
        if(error.message && error.message.includes("Invalid login")){
            return res.status(500).json({message: "Email service configuration error. Please contact support."})
        }
        if(error.code === "EAUTH"){
            return res.status(500).json({message: "Email authentication failed. Please check email credentials."})
        }
        
        res.status(500).json({message: error.message || "Failed to send reset OTP. Please try again later."})
    }
}

exports.resetPassword = async(req, res)=>{
    const {email, otp, newPassword} = req.body
    
    // Validation
    if(!email || !otp || !newPassword){
        return res.status(400).json({
            success: false,
            message: "All fields are required",
            error: "Please provide email, OTP, and new password"
        })
    }

    // Validate OTP format
    if(!/^\d{6}$/.test(otp)){
        return res.status(400).json({
            success: false,
            message: "Invalid OTP format",
            error: "OTP must be a 6-digit number"
        })
    }

    // Validate password strength
    if(newPassword.length < 6){
        return res.status(400).json({
            success: false,
            message: "Password too short",
            error: "Password must be at least 6 characters long"
        })
    }

    try {
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user){
            // Don't reveal if user exists (security best practice)
            return res.status(400).json({
                success: false,
                message: "Invalid request",
                error: "If an account exists with this email, the password has been reset"
            })
        }

        // Validate OTP
        if(!user.resetOtp || user.resetOtp === ""){
            return res.status(400).json({
                success: false,
                message: "No reset OTP found",
                error: "Please request a new reset OTP code"
            })
        }

        if(user.resetOtp !== otp){
            return res.status(400).json({
                success: false,
                message: "Invalid OTP code",
                error: "The OTP code you entered is incorrect"
            })
        }

        // Check expiration
        if(!user.resetOtpExpireAt || user.resetOtpExpireAt < Date.now()){
            // Clear expired OTP
            user.resetOtp = ""
            user.resetOtpExpireAt = 0
            await user.save()
            
            return res.status(400).json({
                success: false,
                message: "OTP expired",
                error: "The OTP code has expired. Please request a new one"
            })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        
        // Update user
        user.password = hashedPassword
        user.resetOtp = ""
        user.resetOtpExpireAt = 0

        await user.save()

        res.status(200).json({
            success: true,
            message: "Password reset successful",
            data: {
                email: user.email
            }
        })
    } catch (error) {
        console.error("Reset Password Error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : "Failed to reset password"
        })
    }
}