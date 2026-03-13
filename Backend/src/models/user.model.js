import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    credits:{
        type:Number,
        default:1000
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    totalReferrals: {
        type: Number,
        default: 0,
    },
    currentStreak: {
        type: Number,
        default: 0,
    },
    longestStreak: {
        type: Number,
        default: 0,
    },
    lastInterviewDate: {
        type: Date,
        default: null,
    },
    subscriptionPlan: {
        type: String,
        enum: ["none", "starter-monthly", "pro-monthly"],
        default: "none",
    },
    subscriptionExpiresAt: {
        type: Date,
        default: null,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    }
}, {timestamps:true});

const userModel = mongoose.model("User", userSchema);

export default userModel;