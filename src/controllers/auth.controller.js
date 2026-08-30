import userModel from "../models/user.model.js"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../config/config.js"
import sessionModel from "../models/session.model.js"
import { sendEmail } from "../services/email.service.js"
import { generateOTP,getOTPhtml } from "../utils/utils.js"
import otpModel from "../models/otp.model.js"

export const register=async(req,res)=>{
    const {username,email,password}=req.body
    const existingUser=await userModel.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(existingUser){
        res.status(409).json({
            message:"username or email already exists"
        })
    }

    const hashedpassword=crypto.createHash("sha256").update(password).digest("hex");

   const user = await userModel.create({
        username,
        email,
        password:hashedpassword
    })

    const otp=generateOTP()
    const html=getOTPhtml(otp)

    const otpHash=crypto.createHash("sha256").update(otp).digest("hex")

    await otpModel.create({
        email,
        user:user._id,
        otpHash
    })
await sendEmail(email, "OTP verification",`your otp is ${otp}`,html)
  

res.status(201).json({
    message:"user registered successfuly",
    user:{
        username:user.username,
        email:user.email,
        verified:user.verified,
        role:user.role
    }
})
}

export const login=async(req,res)=>{
    const {email,password}=req.body

    const user=await userModel.findOne({email})

    if(!user){
        return res.status(401).json({
            message:"invalid email or password"
        })
    }

    if(!user.verified){
        return res.status(401).json({
            message:"email not verified"
        })
    }
  const hashedPassword=crypto.createHash("sha256").update(password).digest("hex")

  const isPasswordValid=hashedPassword ===user.password

     if(!isPasswordValid){
        return res.status(401).json({
            message:"invalid email or password"
        })
    }
   
    const refreshToken=jwt.sign({
        id:user._id
    },config.JWT_SECRET,{expiresIn:"7d"})

    const refreshTokenHash=crypto.createHash("sha256").update(refreshToken).digest("hex")

    const session=await sessionModel.create({
        userID:user._id,
        refreshTokenHash,
        ip:req.ip,
        userAgent:req.headers["user-agent"]
    })


    const accessToken=jwt.sign({
        id:user._id,
        sessionID:session._id
    },config.JWT_SECRET,{expiresIn:"15m"})

    res.cookie("refreshtoken",refreshToken,{
        httpOnly:true,
        secure:true,
        sameSite:"strict",
        maxAge:7*24*60*60*1000
    })

    res.status(200).json({
        message:"logged in successfully",
        user:{
            username:user.username,
            email:user.email,
             role:user.role
        },
        accessToken
    })
}



export const getMe=async(req,res)=>{
    const token=req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(401).json({
            message:"token not found"
        })
    }

    const decoded= jwt.verify(token,config.JWT_SECRET)
   const user=await userModel.findById(decoded.id)
   res.status(200).json({
    message:"user fetched successfuly",
    user:{
        username:user.username,
        emali:user.email
    }
   })
}


export const refresh=async(req,res)=>{
const refreshtoken=req.cookies.refreshtoken

if(!refreshtoken){
    return res.status(401).json({
        message:"refresh token not found"
    })
}

const decoded = jwt.verify(refreshtoken,config.JWT_SECRET)

const hashedRefreshToken=crypto.createHash("sha256").update(refreshtoken).digest("hex")

const session=await sessionModel.findOne({
    refreshTokenHash:hashedRefreshToken,
    revoked:false
})

if(!session){
    return res.status(401).json({
        message:"invalid refresh token"
    })
}

const accessToken= jwt.sign({id:decoded.id},config.JWT_SECRET,{expiresIn:"15m"})

const newRefreshtoken=jwt.sign({id:decoded.id},config.JWT_SECRET,{
    expiresIn:"7d"
})
const newRefreshtokenHashed=crypto.createHash("sha256").update(newRefreshtoken).digest("hex")

session.refreshTokenHash=newRefreshtokenHashed
await session.save()
res.cookie("refreshtoken",newRefreshtoken,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge:7*24*60*60*1000
})

res.status(200).json({
    message:"access token refreshed successfuly",
    accessToken
})
}


export const logout=async(req,res)=>{
    const refreshToken=req.cookies.refreshtoken

    if(!refreshToken){
       return  res.status(400).json({
            message:'refresh token not found'
        })
    }

    const refreshTokenHash=crypto.createHash("sha256").update(refreshToken).digest("hex")

    const session=await sessionModel.findOne({
        refreshTokenHash,
        revoked:false
    })

    if(!session){
        return res.status(400).json({
           message:"invalid refresh token"
        })
    }

    session.revoked=true
    await session.save()

    res.clearCookie("refreshtoken")

    res.status(200).json({
        message:"logged out successfully"
    })
}

export const logoutAll=async(req,res)=>{
    const refreshToken=req.cookies.refreshtoken

    if(!refreshToken){
        return res.status(400).json({
            message:"refresh token was not found"
        })
    }

    const decoded=jwt.verify(refreshToken,config.JWT_SECRET)

    await sessionModel.updateMany({
        user:decoded.id,
        revoked:false
    },
{
    revoked:true
})

res.clearCookie("refreshtoken")

res.status(200).json({
    message:"logged out from all devices successfully"
})
}

export const verifyEmail=async(req,res)=>{
    const  {otp , email} = req.body

    const otpHash=crypto.createHash("sha256").update(otp).digest("hex")

    const otpDoc=await otpModel.findOne({
        email,
        otpHash
    })

    if(!otpDoc){
        return res.status(400).json({
            message:"invalid OTP"
        })
    }

    const user=await userModel.findByIdAndUpdate(otpDoc.user,{
        verified:true
    },
{
        new: true
    })

    await otpModel.deleteMany({
        user:otpDoc.user
    })

    return res.status(200).json({
        message:"email verified  successfully",
        user:{
            username:user.username,
            email:user.email,
            verified:user.verified
        }
    })
}

export const resendOTP = async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email is required"
        });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    if (user.verified) {
        return res.status(400).json({
            message: "Email is already verified"
        });
    }

    // Generate new OTP
    const otp = generateOTP();

    // Hash OTP before storing
    const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    // Delete old OTP(s)
    await otpModel.deleteMany({
        user: user._id
    });

    // Create new OTP
    await otpModel.create({
        email,
        user: user._id,
        otpHash
    });

    // Generate email HTML
    const html = getOTPhtml(otp);

    // Send email
    await sendEmail(
        email,
        "OTP verification",
        `Your new OTP is ${otp}`,
        html
    );

    return res.status(200).json({
        message: "OTP sent successfully"
    });
};