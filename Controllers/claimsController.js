const Claims = require("../Models/claims.js")

exports.claim = async(req,res)=>{
    const {claim} = req.body
    if(!claim){
        return res.status(400).json({message: "Input Field is Required"})
    }
    try {
        const claim = new Claims({claim})
        await claim.save()

        res.status(200).json({message: "claim successfil"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const id = req.params.id

    try {
        const claim = await Claims.findById(id)
        if(!claim){
            return res.status(400).json({message: "claim not found"})
        }
        const deleteclaim = await Claims.findByIdAndDelete(id)
        res.status(200).json({message: "claim deleted  successfull"})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}