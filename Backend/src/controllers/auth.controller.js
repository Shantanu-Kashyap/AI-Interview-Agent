import genToken from "../config/token.js";
import User from "../models/user.model.js";


export const googleAuth = async (req, res) => {
    try {
        const { name, email } = req.body;
        
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({ name, email });
        }
       
        let token = genToken(user._id);
        
        res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 24 * 60 * 60 * 1000 });

        return res.status(200).json({ user, token });
    
    } catch (error) {
        console.error("Error in googleAuth:", error);
        res.status(500).json({ message: 'Error authenticating user', error: error.message });
    }
}

export const logout = async (req, res) => {
    try {
        await res.clearCookie("token").json({ message: "Logged out successfully" });  
    } catch (error) {
        res.status(500).json({ message: "Error logging out", error });  
    }
}