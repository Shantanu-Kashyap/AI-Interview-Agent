import jwt from "jsonwebtoken";



const isAuth= async (req,res,next)=>{
    
    try {
        const cookieToken = req.cookies?.token;
        const authHeader = req.headers?.authorization || "";
        const headerToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : "";

        const token = cookieToken || headerToken;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }   
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error("Error in isAuth middleware:", error);
        res.status(401).json({ message: "Unauthorized: Invalid token", error: error.message });
    }
}

export default isAuth;