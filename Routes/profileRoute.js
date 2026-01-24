const express = require("express")
const { authMiddleWere } = require("../middleWere/authMiddlewere")
const { addExperience, fetchAll, fetchUserById, fetchById, updateProfile, fetchMyProfile } = require("../Controllers/profileController")
const router = express.Router()

router.post("/expr",authMiddleWere,addExperience)
router.get("/my-profile", authMiddleWere, fetchMyProfile)
router.get("/fetch1/:id",authMiddleWere,fetchAll)
router.get("/fetch-user/:id",authMiddleWere,fetchUserById)
router.get("/fetch-profile/:id",authMiddleWere,fetchById)
router.put("/Edit-profile",authMiddleWere,updateProfile)

module.exports = router