import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user ID found" });
        }
        const user= await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(user);

    } catch (error) {
        console.error("Error in getCurrentUser controller:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}