const Claims = require("../Models/claims.js");

exports.claim = async(req, res) => {
    // 1. This 'claim' comes from the frontend request
    const { claim } = req.body; 
    
    if(!claim) {
        return res.status(400).json({message: "Input Field is Required"});
    }

    try {
        // 2. FIXED: Use a unique name like 'newClaim' for the database instance
        // This avoids the "before initialization" error
        const newClaim = new Claims({ claim }); 
        await newClaim.save();

        res.status(200).json({message: "claim successful"}); // Fixed typo: 'successfil'
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
}