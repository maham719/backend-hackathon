import mongoose, { Schema } from "mongoose";

const pendingRegistrationSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        otpHash: {
            type: String,
            required: true
        },

        otpExpiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

pendingRegistrationSchema.index(
    { otpExpiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const PendingRegistration = mongoose.model(
    "PendingRegistration",
    pendingRegistrationSchema
);

export default PendingRegistration;