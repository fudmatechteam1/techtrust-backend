 require("dotenv").config();
const mongoose = require("mongoose")



const dbConnection = async()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Db connected successfull")
    } catch (error) {
        console.log(error.message)
        process.exit(1)
    }
}
module.exports= dbConnection