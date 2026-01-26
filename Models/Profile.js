const mongoose = require("mongoose")
const profileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    skillsArray:{
        type: String,
        required: true
    },
     experience:{
        type: String,
        required: true,
    },
     claimText:{
        type: String,
        required: true,
        trim: true
    },
    currentTrustScore:{
        type: String,
        required: false
    },
    bio: { type: String },
    location: { type: String },
    jobTitle: { type: String },
    trustScoreData: { type: String },
    githubUsername: { type: String },
    vettingSummary: { type: String },
},{
    timestamps: true
});

const Profile = mongoose.model("tech-profile", profileSchema)
module.exports = Profile