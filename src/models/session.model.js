import mongoose, { Schema } from "mongoose";

const sessionSchema=new Schema({
    userID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:[true,"user is required"]
    },
    refreshTokenHash:{
        type:String,
        required:[true,"refresh token is required"]
    },
   ip:{
    type:String,
    required:[true,"ip address is required"]
   },
   userAgent:{
    type:String,
    required:[true,"user agent is required"]
   },
   revoked:{
    type:Boolean,
    default :false
   }
},{timestamps:true})

const sessionModel=mongoose.model("sessions",sessionSchema)


export default sessionModel

