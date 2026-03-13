import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
    FaArrowLeft,
    FaUsers,
    FaClipboardList,
    FaRupeeSign,
    FaFire,
    FaChartLine,
    FaUserCheck,
} from "react-icons/fa";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import Navbar from "../components/Navbar";
import { showApiError } from "../utils/errorHandler";
import apiClient from "../utils/apiClient";

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start"
    >
        <div className={`p-3 rounded-xl ${color} text-white`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-slate-400 text-sm">{label}</p>
            <p className="text-white text-2xl font-bold mt-0.5">{value ?? "—"}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
    </motion.div>
);

const FunnelBar = ({ label, value, max, color }) => (
    <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{label}</span>
            <span className="text-white font-semibold">{value}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full ${color}`}
                style={{ width: max > 0 ? `${(value / max) * 100}%` : "0%" }}
            />
        </div>
    </div>
);

const Admin = () => {
    const navigate = useNavigate();
    const userData = useSelector((s) => s.user.userData);

    const [stats, setStats] = useState(null);
    const [recentUsers, setRecentUsers] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [s, u, t] = await Promise.all([
                apiClient.get("/api/admin/stats"),
                apiClient.get("/api/admin/recent-users?limit=8"),
                apiClient.get("/api/admin/revenue-timeline?days=30"),
            ]);
            setStats(s.data);
            setRecentUsers(u.data);
            setTimeline(t.data);
        } catch (error) {
            showApiError(error, "Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Guard: non-admin users see an access-denied message
    if (!loading && userData && !userData.isAdmin) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-4">
                <p className="text-2xl font-bold">Access Denied</p>
                <p className="text-slate-400">You need admin privileges to view this page.</p>
                <button
                    onClick={() => navigate("/")}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white">
            <Navbar dark />
            <div className="max-w-6xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        <p className="text-slate-400 text-sm">Platform overview & analytics</p>
                    </div>
                    <button
                        onClick={fetchAll}
                        className="ml-auto px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !stats ? (
                    <p className="text-center text-slate-400">Failed to load stats.</p>
                ) : (
                    <>
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <StatCard
                                icon={FaUsers}
                                label="Total Users"
                                value={stats.users.total.toLocaleString()}
                                sub={`+${stats.users.today} today · +${stats.users.thisWeek} this week`}
                                color="bg-blue-600"
                            />
                            <StatCard
                                icon={FaClipboardList}
                                label="Interviews"
                                value={stats.interviews.total.toLocaleString()}
                                sub={`${stats.interviews.completionRate}% completion · ${stats.interviews.today} today`}
                                color="bg-violet-600"
                            />
                            <StatCard
                                icon={FaRupeeSign}
                                label="All-time Revenue"
                                value={`₹${stats.revenue.allTime.toLocaleString()}`}
                                sub={`₹${stats.revenue.thisMonth.toLocaleString()} this month`}
                                color="bg-emerald-600"
                            />
                            <StatCard
                                icon={FaFire}
                                label="Active Subscriptions"
                                value={stats.subscriptions.active.toLocaleString()}
                                sub={stats.subscriptions.planBreakdown
                                    .filter((p) => p.plan !== "none")
                                    .map((p) => `${p.plan}: ${p.count}`)
                                    .join(" · ") || "No active plans"}
                                color="bg-orange-600"
                            />
                            <StatCard
                                icon={FaUserCheck}
                                label="Completed Interviews"
                                value={stats.interviews.completed.toLocaleString()}
                                sub={`${stats.interviews.thisWeek} this week`}
                                color="bg-teal-600"
                            />
                            <StatCard
                                icon={FaChartLine}
                                label="Purchase Rate"
                                value={`${stats.funnel.purchaseRate}%`}
                                sub={`${stats.funnel.purchased} users paid`}
                                color="bg-pink-600"
                            />
                        </div>

                        {/* Revenue chart + Funnel */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Revenue timeline */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h2 className="text-sm font-semibold text-slate-300 mb-4">
                                    Revenue — Last 30 Days (₹)
                                </h2>
                                {timeline.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-10">No revenue data yet.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart data={timeline}>
                                            <defs>
                                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                                                tickFormatter={(v) => v.slice(5)}
                                            />
                                            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                            <Tooltip
                                                contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
                                                labelStyle={{ color: "#94a3b8" }}
                                                formatter={(v) => [`₹${v}`, "Revenue"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#6366f1"
                                                fill="url(#revGrad)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Funnel */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h2 className="text-sm font-semibold text-slate-300 mb-4">
                                    Conversion Funnel
                                </h2>
                                <FunnelBar
                                    label="Signed Up"
                                    value={stats.funnel.signups}
                                    max={stats.funnel.signups}
                                    color="bg-blue-500"
                                />
                                <FunnelBar
                                    label={`Started Interview (${stats.funnel.startRate}%)`}
                                    value={stats.funnel.startedInterview}
                                    max={stats.funnel.signups}
                                    color="bg-violet-500"
                                />
                                <FunnelBar
                                    label={`Completed Interview (${stats.funnel.completionRate}%)`}
                                    value={stats.funnel.completedInterview}
                                    max={stats.funnel.signups}
                                    color="bg-emerald-500"
                                />
                                <FunnelBar
                                    label={`Purchased (${stats.funnel.purchaseRate}%)`}
                                    value={stats.funnel.purchased}
                                    max={stats.funnel.signups}
                                    color="bg-orange-500"
                                />

                                {/* Top roles */}
                                <h2 className="text-sm font-semibold text-slate-300 mt-6 mb-3">Top Roles</h2>
                                {stats.topRoles.map((r) => (
                                    <FunnelBar
                                        key={r.role}
                                        label={r.role}
                                        value={r.count}
                                        max={stats.topRoles[0]?.count || 1}
                                        color="bg-teal-500"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Recent users */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Sign-ups</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-white/10">
                                            <th className="pb-2 pr-4">Name</th>
                                            <th className="pb-2 pr-4">Email</th>
                                            <th className="pb-2 pr-4">Credits</th>
                                            <th className="pb-2 pr-4">Streak</th>
                                            <th className="pb-2 pr-4">Plan</th>
                                            <th className="pb-2">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentUsers.map((u) => (
                                            <tr
                                                key={u._id}
                                                className="border-b border-white/5 hover:bg-white/5 transition"
                                            >
                                                <td className="py-2 pr-4 text-white font-medium">{u.name}</td>
                                                <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                                                <td className="py-2 pr-4 text-emerald-400">{u.credits}</td>
                                                <td className="py-2 pr-4 text-orange-400">
                                                    {u.currentStreak > 0 ? `🔥 ${u.currentStreak}` : "—"}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {u.subscriptionPlan === "none" ? (
                                                        <span className="text-slate-500">Free</span>
                                                    ) : (
                                                        <span className="text-violet-400 font-semibold">
                                                            {u.subscriptionPlan}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 text-slate-500 text-xs">
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Admin;
