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
    }
}, {timestamps:true});

const userModel = mongoose.model("User", userSchema);

export default userModel;