const mongoose = required("mongoose")
const vettingSchema = new mongoose.Schema({
    flags:{
        type: String,
        default: ""
    },
     scoreBreakdown:{
        type: String,
        default: ""
    },
     aiFeedback:{
        type: String,
        default: "",
        trim: true
    },
},{
    timestamps: true
});

const Vetting = mongoose.model("tech-vetting_result", vettingSchema)
module.exports = Vetting