import mongoose ,{Schema} from "mongoose";
const userSchema=new Schema({
    username:{
        type:String,
        required:[true,"username is required"],
        unique:[true,"username must be unique"]
    },
    role:{type:String,default:"user", enum:["user","admin"]},
    email:{
        type:String,
        required:[true,"email is required"],
        unique:[true,"email must be unique"]
    },
    password:{
        type:String,
        required:[true,"password is required"]
    },
    verified:{
        type:Boolean,
        default:false
    }
})

const userModel=mongoose.model("users",userSchema)

export default userModel