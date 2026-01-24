const Profile = require("../Models/Profile")
const User = require("../Models/User")


exports.fetchUserById = async(req,res)=>{
    const id = req.params.id
    try {
        const user = await User.findById(id)
        if(!user){
            return res.status(404).json({message: "User not Found.."})
        }
        res.status(201).json({message:user})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.fetchAll = async(req,res)=>{
    try {
        const profile = await Profile.find()
        if(!profile || profile.length === 0){
            return res.status(404).json({message: "User not Found.."})
        }
        res.status(200).json({message:profile})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.addExperience = async(req,res)=>{
    const {skillsArray,experience,claimText,currentTrustScore} = req.body
    if(!skillsArray || !experience || !claimText || !currentTrustScore){
        return res.status(400).json({message:"Input Field are Requred"})
    }

    try {
        const profile = new Profile({skillsArray,experience,claimText,currentTrustScore})
        await profile.save()

        res.status(201).json({message:"Skills Added..."})
    } catch (error) {
         console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.fetchById = async(req,res)=>{
    const id = req.params.id
    try {
        const profile = await Profile.findById(id)
        if(!profile){
            return res.status(400).json({message: "profile not find..."})
        }

        res.status(200).json({message: profile})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}

exports.updateProfile = async(req,res)=>{
    const id = req.body.id || req.params.id

    if(!id){
        return res.status(400).json({message: "Profile ID is required"})
    }

    try {
        const profile = await Profile.findById(id)
        if(!profile){
            return res.status(404).json({message: "Profile not Found.."})
        }

        const updatedProfile = await Profile.findByIdAndUpdate(id, req.body, {new: true, runValidators: true})

        res.status(200).json({message:"Profile Update Successfull", profile: updatedProfile})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.message})
    }
}