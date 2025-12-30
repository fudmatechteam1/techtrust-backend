const mongoose = require("mongoose")
const jobSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
     description:{
        type: String,
        required: true,
    },
     requiredSkills:{
        type: String,
        required: true,
        trim: true
    },
    status:{
        type: String,
        required: true
    },
},{
    timestamps: true
});

const Job = mongoose.model("tech-Job", jobSchema)
module.exports = Job