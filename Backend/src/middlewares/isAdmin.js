import User from "../models/user.model.js";

const isAdmin = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await User.findById(req.userId).select("isAdmin");
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }
        next();
    } catch (error) {
        console.error("Error in isAdmin middleware:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export default isAdmin;
