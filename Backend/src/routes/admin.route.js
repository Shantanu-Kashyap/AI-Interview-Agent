import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
    getDashboardStats,
    getRecentUsers,
    getRevenueTimeline,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

adminRouter.use(isAuth, isAdmin);

adminRouter.get("/stats", getDashboardStats);
adminRouter.get("/recent-users", getRecentUsers);
adminRouter.get("/revenue-timeline", getRevenueTimeline);

export default adminRouter;
