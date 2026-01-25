const jwt = require("jsonwebtoken")

exports.authMiddleWere = async(req, res, next)=>{
    const token = req.cookies.token
    if(!token){
        return res.status(400).json({message: "Not Authorize token"})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SCRET)
        if(decoded.id){
            req.user = {id: decoded.id}
        }else{
            return res.status(400).json({message: "Not Authorize login"})
        }
        next();
    } catch (error) {
        console.log(error)
        return res.status(400).json({message: error.message})
    }
}

