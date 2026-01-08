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

    if(!email || !password){
        return res.status(400).json({message: "Input Field are Required"})
    }
     const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({message: "Invalid Email"})
        }
        try {
            const ismatch = await bcrypt.compare(password,user.password)
            if(!ismatch){
                return res.status(400).json({message: "Inavalid Password"})
            }
            const token = jwt.sign({id:user._id},process.env.JWT_SCRET,{expiresIn:"7d"})
            res.cookie("token",token,{
                httpOnly:true,
                secure: process.env.NODE_ENV === "production",
                samSite: process.env.NODE_ENV === "production" ?
                "none":"lax",
                maxAge: 5 * 24 * 60 * 1000
            })

            res.status(200).json({message:"User logging Successful"})
        } catch (error) {
             console.log(error)
             res.status(500).json({message: error.message})
        }
}

exports.logout = async(req,res)=>{
    try {
        res.clearCookie("token",{
             httpOnly:true,
            secure: process.env.NODE_ENV === "production",
            samSite: process.env.NODE_ENV === "production" ?
            "none":"lax",
        })
          res.status(200).json({message:"User logout Successful"})
    } catch (error) {
          console.log(error)
            res.status(500).json({message: error.message})
    }
}

// const userType = async(req,res){

// }

exports.getAll = async(req,res)=>{
    try {
        const user = await User.find()
        if(user.length === 0){
             return res.status(404).json({message: "Users not Found"})
        }
        res.status(200).json({message: user})
    } catch (error) {
         console.log(error)
            res.status(500).json({message: error.message})
    }
}

exports.sendVerifyOtp = async(req, res)=>{
    const userid = req.user.id

    try {
        const user = await User.findById(userid)
        if(user.isAccountVerify){
            return res.status(400).json({message: "Users Already Verified..."})
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Verification Otp Code",
            text: `Your Verification Code is ${otp}, Valid fro 10min`
        }

        await transporter.sendMail(mailOption)

        res.status(200).json({message: "Otp Code Send Successful"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.verifyAccount = async(req,res)=>{
    const {otp} = req.body
    const userid= req.user.id

    try {
        const user = await User.findById(userid)
         if(!user){
            return res.status(404).json({message: "User not found"})
        }
        if(user.verifyOtp === "" || user.verifyOtp !== otp){
             return res.status(400).json({message: "Invalid Otp Code"})
        }
        if(user.verifyOtpExpireAt > Date.now){
            return res.status(400).json({message: "Otp Expired"})
        }

        user.verifyOtp = "",
        user.verifyOtpExpireAt = 0,
        user.accountStatus = "Verified",
        user.isAccountVerify = true

        await user.save();

        res.status(200).json({message: "Account Verified Successfull"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.sendResetOtp = async(req,res)=>{
    const {email} = req.body
     if(email){
            return res.status(400).json({message: "Input Field Are Required..."})
        }

        try {
            const user = await User.findOne({email})
            if(!email){
                 return res.status(404).json({message: "Users Not Found..."})
            }

            const otp = String(Math.floor(100000 + Math.random() * 900000))
            const resetOtpExpireAt = Date.now() + 10 * 60 * 1000

            user.resetOtp = otp;
            user.resetOtpExpireAt = resetOtpExpireAt

            await user.save()

            const mailOption = {
                from: process.env.SENDER_EMAIL,
                to: email,
                subject: "Rest Password Otp",
                text: `your reset otp is ${otp}, reset your password with this otp code`
            }
            await transporter.sendMail(mailOption)

            res.status(200).json({message: "reset otp send successful"})
        } catch (error) {
             console.log(error)
        res.status(500).json({message: error.message})
        }

}

exports.resetPassword = async(req,res)=>{
    const {email,otp,newPassword} = req.body
    if(!email || !otp || !newPassword){
        return res.status(400).json({message: "Input Field are Required..."})
    }
    try {
        const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({message: "User not Found"})
        }

        if(otp === "" || otp !== user.resetOtp){
            return res.status(400).json({message: "Invalid Otp Code..."})
        }

        if(resetOtpExpireAt > Date.now){
            return res.status(400).json({message: " Otp Code Expired..."})
        }

        const newPassword = await bcrypt.hash(newPassword,10)
        user.password = newPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0

        await user.save()

        res.status(201).json({message: "Password Reset Successfull..."})
    } catch (error) {
         console.log(error)
        res.status(500).json({message: error.message})
    }
}