import mongoose,{Schema}  from 'mongoose';

const otpSchema=new Schema({
    email:{
        type:String,
        required:[true,"email is required"]
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:[true,"user is required"]
    },
    otpHash:{
        type:String,
        required:[true,"otp hash is required "]
    }
},{timestamps:true})

const otpModel=mongoose.model("otps",otpSchema)

export default otpModel