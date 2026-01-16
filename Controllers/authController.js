const User = require("../Models/User.js")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const transporter = require("../Nodemailer/transporter.js")

// ==========================
// 1. REGISTER USER (FIXED: OTP required before account is active)
// ==========================
exports.register = async (req, res) => {
    const { name, email, password, userType } = req.body
    
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: "All fields are required" })
    }

    try {
        // Check email service configuration first
        if (!process.env.BREVO_API_KEY) {
            console.error("Missing BREVO_API_KEY")
            return res.status(503).json({ message: "Email service not configured. Contact support." })
        }

        const userExist = await User.findOne({ email: email.toLowerCase().trim() })
        if (userExist) {
            return res.status(400).json({ message: "User already exists" })
        }

        // Generate a custom User ID
        const userID = "USER-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const hashedPassword = await bcrypt.hash(password, 10);

        // FIXED: Generate 6-digit OTP during registration
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const user = new User({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            userType: userType,
            userID: userID,
            isAccountVerify: false,           // FIXED: Explicitly set unverified
            accountStatus: "unVerified",      // FIXED: Set account status
            verifyOtp: otp,                   // FIXED: Store OTP
            verifyOtpExpireAt: Date.now() + 10 * 60 * 1000  // FIXED: 10 min expiry
        });

        await user.save();

        // FIXED: Send OTP email immediately after registration
        const mailOption = {
            to: user.email,
            subject: "Verify Your TechTrust Account",
            html: `
                <h2>Welcome to TechTrust, ${name}!</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #002B5C;">${otp}</h1>
                <p>This code is valid for 10 minutes.</p>
                <p>If you did not create this account, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOption);

        // FIXED: Do NOT issue token - user must verify first
        // No cookie set here

        return res.status(201).json({ 
            success: true, 
            message: "Registration successful. Please verify your email.",
            requiresVerification: true,  // FIXED: Flag for frontend
            user: { 
                name: user.name, 
                email: user.email, 
                userType: user.userType,
                userID: user.userID,
                isAccountVerify: false
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Registration Failed", error: error.message });
    }
}

// ==========================
// 2. LOGIN USER (FIXED: Block unverified users)
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

        // FIXED: Block login for unverified users
        if (!user.isAccountVerify) {
            // Optionally resend OTP
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            user.verifyOtp = otp;
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
            await user.save();

            // Send new OTP email
            if (process.env.BREVO_API_KEY) {
                const mailOption = {
                    to: user.email,
                    subject: "Verify Your TechTrust Account",
                    html: `
                        <h2>Hello ${user.name},</h2>
                        <p>Your account is not verified. Use this code to verify:</p>
                        <h1 style="font-size: 32px; letter-spacing: 5px; color: #002B5C;">${otp}</h1>
                        <p>This code is valid for 10 minutes.</p>
                    `
                };
                await transporter.sendMail(mailOption).catch(err => console.error("OTP Email Error:", err));
            }

            // FIXED: Return 403 with flag - NO token issued
            return res.status(403).json({
                success: false,
                message: "Account not verified. A new OTP has been sent to your email.",
                requiresVerification: true,  // FIXED: Frontend redirect flag
                email: user.email            // Pass email for OTP form
            })
        }

        // Only issue token for verified users
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
        if(!process.env.BREVO_API_KEY){ 
            console.error("Missing BREVO_API_KEY")
            return res.status(503).json({message: "Email service not configured (API Key missing)."})
        }

        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user) return res.status(404).json({message: "User not found"})
        
        if(user.isAccountVerify) return res.status(400).json({message: "User Already Verified"})
        
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000
        await user.save()

        const mailOption = {
            to: user.email,
            subject: "Verification OTP Code",
            html: `
                <h2>Hello ${user.name},</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #002B5C;">${otp}</h1>
                <p>This code is valid for 10 minutes.</p>
            `
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
        if(!process.env.BREVO_API_KEY){
            return res.status(503).json({message: "Email service not configured (API Key missing)."})
        }

        const user = await User.findOne({email: email.toLowerCase().trim()})
        if(!user) return res.status(404).json({message: "User not found"})

        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000
        await user.save()

        const mailOption = {
            to: email,
            subject: "Reset Password OTP",
            html: `
                <h2>Password Reset Request</h2>
                <p>Your reset code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #002B5C;">${otp}</h1>
                <p>This code is valid for 10 minutes.</p>
            `
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
