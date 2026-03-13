import genToken from "../config/token.js";
import User from "../models/user.model.js";

const generateReferralCode = (name = "") => {
    const normalized = name
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 4) || "USER";
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${normalized}${randomPart}`;
};


export const googleAuth = async (req, res) => {
    try {
        const { name, email } = req.body;
        
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({
                name,
                email,
                referralCode: generateReferralCode(name),
            });
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

export const applyReferralCode = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const normalizedCode = String(referralCode || "").trim().toUpperCase();

        if (!normalizedCode) {
            return res.status(400).json({ message: "Referral code is required" });
        }

        const currentUser = await User.findById(req.userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.referredBy) {
            return res.status(400).json({ message: "Referral already applied" });
        }

        if (currentUser.referralCode === normalizedCode) {
            return res.status(400).json({ message: "You cannot use your own referral code" });
        }

        const referrer = await User.findOne({ referralCode: normalizedCode });
        if (!referrer) {
            return res.status(404).json({ message: "Referral code not found" });
        }

        currentUser.referredBy = referrer._id;
        currentUser.credits += 100;
        referrer.credits += 100;
        referrer.totalReferrals += 1;

        await Promise.all([currentUser.save(), referrer.save()]);

        return res.status(200).json({
            message: "Referral applied successfully. Bonus credits added.",
            user: currentUser,
        });
    } catch (error) {
        console.error("Error applying referral code:", error);
        return res.status(500).json({ message: "Error applying referral code" });
    }
};