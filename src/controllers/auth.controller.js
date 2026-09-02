import userModel from "../models/user.model.js"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../config/config.js"
import sessionModel from "../models/session.model.js"
import { sendEmail } from "../services/email.service.js"
import { generateOTP,getOTPhtml } from "../utils/utils.js"
import otpModel from "../models/otp.model.js"
import Ticket from "../models/ticket.model.js"
import Settings from "../models/settings.model.js"
import PendingRegistration from "../models/pendingRegistration.model.js";


export const getSettings = async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            { key: "supportflow" },
            { $setOnInsert: { key: "supportflow" } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        return res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Get Settings Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch settings." });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const allowedFields = [
            "supportDeskName",
            "defaultTicketPriority",
            "defaultTicketStatus",
            "aiTriageEnabled",
            "ticketNotificationsEnabled"
        ];
        const updates = Object.fromEntries(
            allowedFields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]])
        );

        const settings = await Settings.findOneAndUpdate(
            { key: "supportflow" },
            { $set: updates },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        ).lean();

        return res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Update Settings Error:", error);
        return res.status(400).json({ success: false, message: error.message || "Failed to save settings." });
    }
};

export const getCustomers = async (req, res) => {
    try {
        const customers = await userModel.find({ role: "user" })
            .select("username email createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const customerRows = await Promise.all(customers.map(async (customer) => {
            const [totalTickets, openTickets, resolvedTickets] = await Promise.all([
                Ticket.countDocuments({ customer: customer._id }),
                Ticket.countDocuments({ customer: customer._id, status: { $in: ["open", "in_progress"] } }),
                Ticket.countDocuments({ customer: customer._id, status: "resolved" })
            ]);

            return { ...customer, totalTickets, openTickets, resolvedTickets };
        }));

        return res.status(200).json({ success: true, customers: customerRows });
    } catch (error) {
        console.error("Get Customers Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch customers." });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const customer = await userModel.findOne({ _id: req.params.customerId, role: "user" })
            .select("username email createdAt")
            .lean();

        if (!customer) return res.status(404).json({ message: "Customer not found." });

        const tickets = await Ticket.find({ customer: customer._id })
            .select("subject category priority status createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, customer, tickets });
    } catch (error) {
        console.error("Get Customer Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch customer." });
    }
};

export const getAgents = async (req, res) => {
    try {
        const agents = await userModel.find({ role: "agent" }).select("username email active category").sort({ username: 1 }).lean();
        const agentRows = await Promise.all(agents.map(async (agent) => ({
            ...agent,
            assignedTickets: await Ticket.countDocuments({ assignedAgent: agent._id }),
            inProgress: await Ticket.countDocuments({ assignedAgent: agent._id, status: "in_progress" }),
            resolved: await Ticket.countDocuments({ assignedAgent: agent._id, status: "resolved" })
        })));
        return res.status(200).json({ success: true, agents: agentRows });
    } catch (error) {
        console.error("Get Agents Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch agents." });
    }
};

export const createAgent = async (req, res) => {
    try {
        const { username, email, password, category } = req.body;
        if (!username || !email || !password || !category) return res.status(400).json({ message: "Name, email, password, and category are required." });
        if (!["technical", "billing", "account", "general"].includes(category)) return res.status(400).json({ message: "Invalid agent category." });
        const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(409).json({ message: "Username or email already exists." });
        const agent = await userModel.create({ username, email, category, password: crypto.createHash("sha256").update(password).digest("hex"), role: "agent", verified: true, active: true });
        return res.status(201).json({ success: true, agent: { _id: agent._id, username: agent.username, email: agent.email, category: agent.category, active: agent.active, assignedTickets: 0, inProgress: 0, resolved: 0 } });
    } catch (error) {
        console.error("Create Agent Error:", error);
        return res.status(500).json({ success: false, message: "Failed to create agent." });
    }
};

export const updateAgentStatus = async (req, res) => {
    try {
        const agent = await userModel.findOneAndUpdate({ _id: req.params.agentId, role: "agent" }, { active: req.body.active }, { new: true }).select("username email active");
        if (!agent) return res.status(404).json({ message: "Agent not found." });
        return res.status(200).json({ success: true, agent });
    } catch (error) {
        console.error("Update Agent Status Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update agent status." });
    }
};


export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required"
            });
        }

        const existingUser = await userModel.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        // Remove any previous pending registration
        await PendingRegistration.deleteMany({
            $or: [
                { username },
                { email }
            ]
        });

        const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

        const otp = generateOTP();

        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const otpExpiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        await PendingRegistration.create({
            username,
            email,
            password: hashedPassword,
            otpHash,
            otpExpiresAt
        });

        const html = getOTPhtml(otp);

        await sendEmail(
            email,
            "OTP verification",
            `Your OTP is ${otp}`,
            html
        );

        return res.status(201).json({
            message: "OTP sent successfully. Please verify your email."
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            message: "Registration failed"
        });
    }
};
// export const register=async(req,res)=>{
//     const {username,email,password}=req.body
//     const existingUser=await userModel.findOne({
//         $or:[
//             {username},
//             {email}
//         ]
//     })

//     if(existingUser){
//         res.status(409).json({
//             message:"username or email already exists"
//         })
//     }

//     const hashedpassword=crypto.createHash("sha256").update(password).digest("hex");

//    const user = await userModel.create({
//         username,
//         email,
//         password:hashedpassword
//     })

//     const otp=generateOTP()
//     const html=getOTPhtml(otp)

//     const otpHash=crypto.createHash("sha256").update(otp).digest("hex")

//     await otpModel.create({
//         email,
//         user:user._id,
//         otpHash
//     })
// await sendEmail(email, "OTP verification",`your otp is ${otp}`,html)
  

// res.status(201).json({
//     message:"user registered successfuly",
//     user:{
//         username:user.username,
//         email:user.email,
//         verified:user.verified,
//         role:user.role
//     }
// })
// }

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

    if (user.role === "agent" && !user.active) {
        return res.status(401).json({
            message: "This agent account is inactive"
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
        id:user._id,

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
        sessionID:session._id,
        role:user.role,
        category:user.category
    },config.JWT_SECRET,{expiresIn:"15m"})

    res.cookie("refreshtoken",refreshToken,{
        httpOnly:true,
       secure: process.env.NODE_ENV === "production",
sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge:7*24*60*60*1000
    })

    res.status(200).json({
        message:"logged in successfully",
        user:{
            username:user.username,
            email:user.email,
             role:user.role,
             category:user.category
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
        emali:user.email,
        role:user.role,
        category:user.category
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

console.log("REFRESH TOKEN EXISTS:", !!refreshtoken);
console.log("HASH:", hashedRefreshToken);

const session=await sessionModel.findOne({
    refreshTokenHash:hashedRefreshToken,
    revoked:false
})

if(!session){
    return res.status(401).json({
        message:"invalid refresh token"
    })
}


const user = await userModel.findById(decoded.id);

if (!user) {
    return res.status(401).json({
        message: "User not found"
    });
}

const accessToken = jwt.sign(
    {
        id: user._id,
        sessionID: session._id,
        role: user.role
    },
    config.JWT_SECRET,
    {
        expiresIn: "15m"
    }
);

const newRefreshtoken=jwt.sign({id:decoded.id},config.JWT_SECRET,{
    expiresIn:"7d"
})
const newRefreshtokenHashed=crypto.createHash("sha256").update(newRefreshtoken).digest("hex")

session.refreshTokenHash=newRefreshtokenHashed
await session.save()
res.cookie("refreshtoken",newRefreshtoken,{
    httpOnly:true,
   secure: process.env.NODE_ENV === "production",
sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:7*24*60*60*1000
})

res.status(200).json({
    message:"access token refreshed successfuly",
    accessToken,
    role:user.role,
    category:user.category
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

// export const verifyEmail=async(req,res)=>{
//     const  {otp , email} = req.body

//     const otpHash=crypto.createHash("sha256").update(otp).digest("hex")

//     const otpDoc=await otpModel.findOne({
//         email,
//         otpHash
//     })

//     if(!otpDoc){
//         return res.status(400).json({
//             message:"invalid OTP"
//         })
//     }

//     const user=await userModel.findByIdAndUpdate(otpDoc.user,{
//         verified:true
//     },
// {
//         new: true
//     })

//     await otpModel.deleteMany({
//         user:otpDoc.user
//     })

//     return res.status(200).json({
//         message:"email verified  successfully",
//         user:{
//             username:user.username,
//             email:user.email,
//             verified:user.verified
//         }
//     })
// }
export const verifyEmail = async (req, res) => {
    try {
        const { otp, email } = req.body;

        if (!otp || !email) {
            return res.status(400).json({
                message: "OTP and email are required"
            });
        }

        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const pendingRegistration = await PendingRegistration.findOne({
            email,
            otpHash,
            otpExpiresAt: { $gt: new Date() }
        });

        if (!pendingRegistration) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        // Double-check that nobody registered these credentials
        const existingUser = await userModel.findOne({
            $or: [
                { username: pendingRegistration.username },
                { email: pendingRegistration.email }
            ]
        });

        if (existingUser) {
            await PendingRegistration.deleteOne({
                _id: pendingRegistration._id
            });

            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        // NOW create the actual user
        const user = await userModel.create({
            username: pendingRegistration.username,
            email: pendingRegistration.email,
            password: pendingRegistration.password,
            verified: true
        });

        // Delete temporary registration
        await PendingRegistration.deleteOne({
            _id: pendingRegistration._id
        });

        return res.status(200).json({
            message: "Email verified successfully",
            user: {
                username: user.username,
                email: user.email,
                verified: user.verified,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Verify Email Error:", error);

        return res.status(500).json({
            message: "Email verification failed"
        });
    }
};

// export const resendOTP = async (req, res) => {

//     const { email } = req.body;

//     if (!email) {
//         return res.status(400).json({
//             message: "Email is required"
//         });
//     }

//     const user = await userModel.findOne({ email });

//     if (!user) {
//         return res.status(404).json({
//             message: "User not found"
//         });
//     }

//     if (user.verified) {
//         return res.status(400).json({
//             message: "Email is already verified"
//         });
//     }

//     // Generate new OTP
//     const otp = generateOTP();

//     // Hash OTP before storing
//     const otpHash = crypto
//         .createHash("sha256")
//         .update(otp)
//         .digest("hex");

//     // Delete old OTP(s)
//     await otpModel.deleteMany({
//         user: user._id
//     });

//     // Create new OTP
//     await otpModel.create({
//         email,
//         user: user._id,
//         otpHash
//     });

//     // Generate email HTML
//     const html = getOTPhtml(otp);

//     // Send email
//     await sendEmail(
//         email,
//         "OTP verification",
//         `Your new OTP is ${otp}`,
//         html
//     );

//     return res.status(200).json({
//         message: "OTP sent successfully"
//     });
// };


export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const pendingRegistration =
            await PendingRegistration.findOne({ email });

        if (!pendingRegistration) {
            return res.status(404).json({
                message: "Registration not found. Please register again."
            });
        }

        const otp = generateOTP();

        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        pendingRegistration.otpHash = otpHash;
        pendingRegistration.otpExpiresAt =
            new Date(Date.now() + 10 * 60 * 1000);

        await pendingRegistration.save();

        const html = getOTPhtml(otp);

        await sendEmail(
            email,
            "OTP verification",
            `Your new OTP is ${otp}`,
            html
        );

        return res.status(200).json({
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);

        return res.status(500).json({
            message: "Failed to resend OTP"
        });
    }
};
export const getAnalytics = async (req, res) => {
    try {
        const requestedRange = Number(req.query.range);
        const range = [7, 30, 90].includes(requestedRange) ? requestedRange : 7;
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (range - 1));

        const tickets = await Ticket.find({ createdAt: { $gte: startDate } }).select("status category priority assignedAgent createdAt").lean();
        const agents = await userModel.find({ role: "agent" }).select("username").sort({ username: 1 }).lean();
        const count = (items, predicate) => items.filter(predicate).length;
        const byDay = Array.from({ length: range }, (_, index) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + index);
            const dateKey = date.toISOString().slice(0, 10);
            return {
                date: dateKey,
                label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                created: count(tickets, (ticket) => ticket.createdAt?.toISOString().slice(0, 10) === dateKey),
                resolved: count(tickets, (ticket) => ticket.status === "resolved" && ticket.createdAt?.toISOString().slice(0, 10) === dateKey)
            };
        });

        const agentPerformance = agents.map((agent) => ({
            _id: agent._id,
            name: agent.username,
            assigned: count(tickets, (ticket) => ticket.assignedAgent?.toString() === agent._id.toString()),
            resolved: count(tickets, (ticket) => ticket.assignedAgent?.toString() === agent._id.toString() && ticket.status === "resolved"),
            inProgress: count(tickets, (ticket) => ticket.assignedAgent?.toString() === agent._id.toString() && ticket.status === "in_progress")
        }));

        const resolvedTickets = count(tickets, (ticket) => ticket.status === "resolved");
        return res.status(200).json({
            success: true,
            range,
            summary: {
                totalTickets: tickets.length,
                newTickets: count(tickets, (ticket) => ticket.status === "open"),
                resolvedTickets,
                resolutionRate: tickets.length ? Math.round((resolvedTickets / tickets.length) * 100) : 0
            },
            volume: byDay,
            status: ["open", "assigned", "in_progress", "resolved"].map((value) => ({ label: value === "in_progress" ? "In Progress" : value[0].toUpperCase() + value.slice(1), value: value === "assigned" ? count(tickets, (ticket) => ticket.assignedAgent) : count(tickets, (ticket) => ticket.status === value) })),
            category: ["billing", "technical", "account", "general"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value: count(tickets, (ticket) => ticket.category === value) })),
            priority: ["high", "medium", "low", "urgent"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value: count(tickets, (ticket) => ticket.priority === value) })),
            agentPerformance
        });
    } catch (error) {
        console.error("Get Analytics Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch analytics." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username?.trim()) {
            return res.status(400).json({ message: "Name is required." });
        }

        const updates = { username: username.trim() };
        if (password) {
            if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
            updates.password = crypto.createHash("sha256").update(password).digest("hex");
        }

        const user = await userModel.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select("username email role");
        if (!user) return res.status(404).json({ message: "Admin profile not found." });

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(400).json({ success: false, message: error.message || "Failed to update profile." });
    }
};