const User = require("../Models/User.js")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const transporter = require("../Nodemailer/transporter.js")

// Helper to generate token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.userType },
        process.env.JWT_SCRET || 'fallback_secret',
        { expiresIn: "7d" }
    );
};

// ==========================
// 1. REGISTER USER (Sends OTP, NO Token)
// ==========================
exports.register = async (req, res) => {
    const { name, email, password, userType } = req.body
    
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: "All fields are required" })
    }

    try {
        const userExist = await User.findOne({ email })
        if (userExist) {
            return res.status(400).json({ message: "User already exists" })
        }

        if(!process.env.BREVO_API_KEY){ 
            return res.status(503).json({message: "Service Unavailable: Email system not configured."})
        }

        const userID = "USER-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const user = new User({
            name,
            email,
            password: hashedPassword,
            userType: userType,
            userID: userID,
            isAccountVerify: false, 
            verifyOtp: otp,         
            verifyOtpExpireAt: Date.now() + 10 * 60 * 1000 
        });

        await user.save();

        // Send OTP Email
        const mailOption = {
            to: user.email,
            subject: "Verify Your Tech Trust Account",
            text: `Welcome to Tech Trust! Your verification code is: ${otp}`
        }

        await transporter.sendMail(mailOption)

        // SUCCESS: No Token Sent here. User must verify first.
        return res.status(201).json({ 
            success: true, 
            message: "Registration successful. Please check your email for OTP.",
            user: { email: user.email }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Registration Failed", error: error.message });
    }
}

// ==========================
// 2. VERIFY ACCOUNT (Now Logs User In)
// ==========================
exports.verifyAccount = async(req, res)=>{
    const {email, otp} = req.body
    if(!email || !otp) return res.status(400).json({success: false, message: "Email and OTP required"})

    try {
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user) return res.status(404).json({success: false, message: "User not found"})

        if(user.isAccountVerify) return res.status(400).json({success: false, message: "Account already verified"})

        if(user.verifyOtp !== otp){
            return res.status(400).json({success: false, message: "Invalid OTP code"})
        }

        if(user.verifyOtpExpireAt < Date.now()){
             return res.status(400).json({success: false, message: "OTP expired"})
        }

        // Verify Success
        user.verifyOtp = ""
        user.verifyOtpExpireAt = 0
        user.accountStatus = "Verified"
        user.isAccountVerify = true
        await user.save()

        // --- NEW: Generate Token Here (Auto Login) ---
        const token = generateToken(user);
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true, 
            message: "Account verified successfully",
            token: token, // Send token to frontend
            user: {
                name: user.name,
                email: user.email,
                userType: user.userType,
                id: user._id,
                userID: user.userID
            }
        })
    } catch (error) {
        res.status(500).json({success: false, message: "Internal server error"})
    }
}

// ==========================
// 3. LOGIN USER
// ==========================
exports.login = async(req, res)=>{
    const {email, password} = req.body

    if(!email || !password){
        return res.status(400).json({ success: false, message: "Email and password are required" })
    }

    try {
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user){
            return res.status(401).json({ success: false, message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.status(401).json({ success: false, message: "Invalid credentials" })
        }
        
        // Optional: Check if verified before login
        if(!user.isAccountVerify) {
             return res.status(403).json({ success: false, message: "Please verify your email first." })
        }

        const token = generateToken(user);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 
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
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

// ==========================
// 4. OTHER FUNCTIONS
// ==========================
exports.logout = async(req, res)=>{
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/" 
        })
        res.status(200).json({ success: true, message: "Logout successful" })
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to logout" })
    }
}

exports.getAll = async(req, res)=>{
    try {
        const users = await User.find().select('-password -verifyOtp -resetOtp')
        res.status(200).json({ success: true, data: users })
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

exports.sendVerifyOtp = async(req, res)=>{
    const {email} = req.body
    if(!email) return res.status(400).json({message: "Email is required"})

    try {
        if(!process.env.BREVO_API_KEY){ 
            return res.status(503).json({message: "Service Unavailable"})
        }

        const user = await User.findOne({email})
        if(!user) return res.status(404).json({message: "User not found"})
        
        if(user.isAccountVerify) return res.status(400).json({message: "User Already Verified"})
        
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000
        await user.save()

        const mailOption = {
            to: user.email,
            subject: "Verification Otp Code",
            text: `Your Verification Code is ${otp}, Valid for 10 minutes`
        }

        await transporter.sendMail(mailOption)

        res.status(200).json({message: "OTP Code sent successfully"})
    } catch (error) {
        res.status(500).json({message: "Failed to send OTP", error: error.message})
    }
}

exports.sendResetOtp = async(req,res)=>{
    const {email} = req.body
    if(!email) return res.status(400).json({message: "Email is required"})

    try {
        if(!process.env.BREVO_API_KEY){
            return res.status(503).json({message: "Service Unavailable"})
        }

        const user = await User.findOne({email})
        if(!user) return res.status(404).json({message: "User not found"})

        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000
        await user.save()

        const mailOption = {
            to: email,
            subject: "Reset Password Otp",
            text: `Your reset OTP is ${otp}. Use this code to reset your password.`
        }

        await transporter.sendMail(mailOption)

        res.status(200).json({message: "Reset OTP sent successfully"})
    } catch (error) {
        res.status(500).json({message: "Failed to send reset OTP", error: error.message})
    }
}

exports.resetPassword = async(req, res)=>{
    const {email, otp, newPassword} = req.body
    if(!email || !otp || !newPassword) return res.status(400).json({message: "All fields required"})

    try {
        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user) return res.status(400).json({message: "Invalid request"})

        if(user.resetOtp !== otp) return res.status(400).json({message: "Invalid OTP code"})

        if(user.resetOtpExpireAt < Date.now()) return res.status(400).json({message: "OTP expired"})

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        user.resetOtp = ""
        user.resetOtpExpireAt = 0
        await user.save()

        res.status(200).json({success: true, message: "Password reset successful"})
    } catch (error) {
        res.status(500).json({message: "Failed to reset password"})
    }
}