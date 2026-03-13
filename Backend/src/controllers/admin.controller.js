import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";
import Payment from "../models/payment.mode..js";

// Helper: UTC start of a given day
const dayStart = (date = new Date()) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

// Helper: UTC start of Monday of the current week
const weekStart = () => {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setUTCDate(now.getUTCDate() + diff);
    mon.setUTCHours(0, 0, 0, 0);
    return mon;
};

export const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = dayStart(now);
        const thisWeekStart = weekStart();

        const [
            totalUsers,
            usersToday,
            usersThisWeek,
            totalInterviews,
            completedInterviews,
            interviewsToday,
            interviewsThisWeek,
            revenueAgg,
            revenueThisMonth,
            activeSubscriptions,
            topRoles,
            planBreakdown,
        ] = await Promise.all([
            // Users
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: todayStart } }),
            User.countDocuments({ createdAt: { $gte: thisWeekStart } }),

            // Interviews
            Interview.countDocuments(),
            Interview.countDocuments({ status: "completed" }),
            Interview.countDocuments({ createdAt: { $gte: todayStart } }),
            Interview.countDocuments({ createdAt: { $gte: thisWeekStart } }),

            // Revenue (all time)
            Payment.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Revenue this month
            Payment.aggregate([
                {
                    $match: {
                        status: "paid",
                        createdAt: {
                            $gte: new Date(now.getUTCFullYear(), now.getUTCMonth(), 1),
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),

            // Active subscriptions
            User.countDocuments({
                subscriptionPlan: { $ne: "none" },
                subscriptionExpiresAt: { $gt: now },
            }),

            // Top interview roles
            Interview.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),

            // Subscription plan breakdown
            User.aggregate([
                {
                    $group: {
                        _id: "$subscriptionPlan",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        // Funnel: signups → started interview → completed → purchased
        const usersWhoInterviewed = await Interview.distinct("userId");
        const usersWhoCompleted = await Interview.distinct("userId", { status: "completed" });
        const usersWhoPaid = await Payment.distinct("userId", { status: "paid" });

        const funnel = {
            signups: totalUsers,
            startedInterview: usersWhoInterviewed.length,
            completedInterview: usersWhoCompleted.length,
            purchased: usersWhoPaid.length,
            startRate: totalUsers > 0 ? ((usersWhoInterviewed.length / totalUsers) * 100).toFixed(1) : "0",
            completionRate: usersWhoInterviewed.length > 0 ? ((usersWhoCompleted.length / usersWhoInterviewed.length) * 100).toFixed(1) : "0",
            purchaseRate: totalUsers > 0 ? ((usersWhoPaid.length / totalUsers) * 100).toFixed(1) : "0",
        };

        return res.status(200).json({
            users: {
                total: totalUsers,
                today: usersToday,
                thisWeek: usersThisWeek,
            },
            interviews: {
                total: totalInterviews,
                completed: completedInterviews,
                today: interviewsToday,
                thisWeek: interviewsThisWeek,
                completionRate: totalInterviews > 0 ? ((completedInterviews / totalInterviews) * 100).toFixed(1) : "0",
            },
            revenue: {
                allTime: (revenueAgg[0]?.total ?? 0) / 100,       // paise → ₹
                thisMonth: (revenueThisMonth[0]?.total ?? 0) / 100,
            },
            subscriptions: {
                active: activeSubscriptions,
                planBreakdown: planBreakdown.map((p) => ({
                    plan: p._id,
                    count: p.count,
                })),
            },
            topRoles: topRoles.map((r) => ({ role: r._id, count: r.count })),
            funnel,
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const getRecentUsers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const users = await User.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("name email credits currentStreak subscriptionPlan createdAt");
        return res.status(200).json(users);
    } catch (error) {
        console.error("Error in getRecentUsers:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const getRevenueTimeline = async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const since = new Date();
        since.setUTCDate(since.getUTCDate() - days);
        since.setUTCHours(0, 0, 0, 0);

        const timeline = await Payment.aggregate([
            { $match: { status: "paid", createdAt: { $gte: since } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    revenue: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return res.status(200).json(
            timeline.map((t) => ({
                date: t._id,
                revenue: t.revenue / 100,
                transactions: t.count,
            }))
        );
    } catch (error) {
        console.error("Error in getRevenueTimeline:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
