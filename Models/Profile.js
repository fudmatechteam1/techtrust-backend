const mongoose = require("mongoose")
const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
        required: true
    },
},{
    timestamps: true
});

const Profile = mongoose.model("tech-profile", profileSchema)
module.exports = Profile