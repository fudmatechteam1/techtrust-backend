const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
    userType:{
        type: String,
        enum: ["professional","recruiter","admin"],
        default: "recruiter",
        required: true
    },
       name:{
        type: String,
        required: true
    },
     email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
     password:{
        type: String,
        required: true,
        trim: true
    },
    accountStatus:{
        type: String,
        enum: ["Verified","unVerified"],
        default: "unVerified"
    },
       verifyOtp:{
        type: String,
        default: "",
    },
      verifyOtpExpireAt:{
        type: Number,
        default: 0,
    }, 
    resetOtp:{
        type: String,
        default: "",
    },
      resetOtpExpireAt:{
        type: Number,
        default: 0,
    },
     isAccountVerify:{
        type: Boolean,
        default: false,
    },
      userID:{
        type: String,
        default: "",
        unique:true
    }
},{
    timestamps: true
});

const User = mongoose.model("tech-users", userSchema)
module.exports = User;