const mongoose = require("mongoose");

const vettingSchema = new mongoose.Schema({
    // Links the result to the specific user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // The actual numerical score (0-100)
    score: {
        type: Number,
        default: 0
    },
    flags: {
        type: String,
        default: ""
    },
    scoreBreakdown: {
        type: String,
        default: ""
    },
    aiFeedback: {
        type: String,
        default: "",
        trim: true
    },
}, {
    timestamps: true
});

const Vetting = mongoose.model("tech-vetting_result", vettingSchema);
module.exports = Vetting;