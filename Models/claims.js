const mongoose = require("mongoose")
const claimSchema = new mongoose.Schema({
    claim:{
        type: String,
        required: true,
        trim: true
    },
    
},{
    timestamps: true
});

const Claims = mongoose.model("tech-claim", claimSchema)
module.exports = Claims