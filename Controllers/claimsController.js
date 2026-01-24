const Claims = require("../Models/claims.js");

exports.claim = async(req, res) => {
    // 1. The data coming from the frontend
    const { claim } = req.body; 
    
    if(!claim) {
        return res.status(400).json({message: "Input Field is Required"});
    }

    try {
        // 2. FIXED: Using 'newClaim' avoids the naming conflict with the input variable
        const newClaim = new Claims({ claim }); 
        await newClaim.save();

        res.status(200).json({message: "claim successful"}); 
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
};

exports.remove = async(req, res) => {
    const id = req.params.id;

    try {
        const foundClaim = await Claims.findById(id);
        if(!foundClaim) {
            return res.status(400).json({message: "claim not found"});
        }
        await Claims.findByIdAndDelete(id);
        res.status(200).json({message: "claim deleted successfully"});
    } catch (error) {
         console.log(error);
        res.status(500).json({message: error.message});
    }
};