const express = require("express")
const { authMiddleWere } = require("../middleWere/authMiddlewere")
const { claim, remove } = require("../Controllers/claimsController")
const Claims = require("../Models/claims.js")

const router = express.Router()

// Get all claims
router.get("/fetch", authMiddleWere, async (req, res) => {
    try {
        const claims = await Claims.find().sort({ createdAt: -1 })
        res.status(200).json({ success: true, message: claims })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})

// Submit a claim
router.post("/claim", authMiddleWere, claim)

// Delete a claim
router.delete("/remove/:id", authMiddleWere, remove)

module.exports = router
