const User = require("../Models/User.js")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const transporter = require("../Nodemailer/transporter.js")

// ==========================
// 1. REGISTER USER
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

        // Generate a custom User ID (e.g., USER-X7Z9...)
        const userID = "USER-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            userType: userType,
            userID: userID,
            isAccountVerify: false // Default to unverified
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.userType },
            process.env.JWT_SCRET || 'fallback_secret', // Fixed typo in env var name if needed
            { expiresIn: "7d" }
        );

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // Always true for Render/Production
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ 
            success: true, 
            message: "Registration successful",
            user: { 
                name: user.name, 
                email: user.email, 
                userType: user.userType,
                userID: user.userID 
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Registration Failed", error: error.message });
    }
}

// ==========================
// 2. LOGIN USER
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

        const token = jwt.sign(
            {id: user._id, role: user.userType}, 
            process.env.JWT_SCRET || 'fallback_secret',
            {expiresIn: "7d"}
        )

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
// 3. LOGOUT USER
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

// ==========================
// 4. GET ALL USERS (For Admin/Debug)
// ==========================
exports.getAll = async(req, res)=>{
    try {
        const users = await User.find().select('-password -verifyOtp -resetOtp')
        res.status(200).json({ success: true, data: users })
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

// ==========================
// 5. SEND VERIFY OTP
// ==========================
exports.sendVerifyOtp = async(req, res)=>{
    const {email} = req.body
    if(!email) return res.status(400).json({message: "Email is required"})

    try {
        // CHECK: Ensure Brevo Key exists (removed SENDER_PASSWORD check)
        if(!process.env.BREVO_API_KEY){ 
            console.error("Missing BREVO_API_KEY")
            return res.status(503).json({message: "Email service not configured (API Key missing)."})
        }

        const user = await User.findOne({email})
        if(!user) return res.status(404).json({message: "User not found"})
        
        if(user.isAccountVerify) return res.status(400).json({message: "User Already Verified"})
        
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000 // 10 minutes
        await user.save()

        const mailOption = {
            to: user.email,
            subject: "Verification Otp Code",
            text: `Your Verification Code is ${otp}, Valid for 10 minutes`
        }

        await transporter.sendMail(mailOption)

        res.status(200).json({message: "OTP Code sent successfully"})
    } catch (error) {
        console.error("SendVerifyOtp Error:", error)
        res.status(500).json({message: "Failed to send OTP", error: error.message})
    }
}

// ==========================
// 6. VERIFY ACCOUNT
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

        res.status(200).json({success: true, message: "Account verified successfully"})
    } catch (error) {
        res.status(500).json({success: false, message: "Internal server error"})
    }
}

// ==========================
// 7. SEND RESET OTP
// ==========================
exports.sendResetOtp = async(req,res)=>{
    const {email} = req.body
    if(!email) return res.status(400).json({message: "Email is required"})

    try {
        // CHECK: Ensure Brevo Key exists (removed SENDER_PASSWORD check)
        if(!process.env.BREVO_API_KEY){
            return res.status(503).json({message: "Email service not configured (API Key missing)."})
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
        console.error("SendResetOtp Error:", error)
        res.status(500).json({message: "Failed to send reset OTP", error: error.message})
    }
}

// ==========================
// 8. RESET PASSWORD
// ==========================
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