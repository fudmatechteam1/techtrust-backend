const mongoose = require("mongoose")
const matchSchema = new mongoose.Schema({
    jobID:{
        type: String,
        default: ""
    },
     profileID:{
        type: String,
        default: ""
    },
     matchScore:{
        type: String,
        default: "",
        trim: true
    },
    status:{
        type: String,
        default: ""
    },
},{
    timestamps: true
});

const Match = mongoose.model("tech-match", matchSchema)
module.exports = Match