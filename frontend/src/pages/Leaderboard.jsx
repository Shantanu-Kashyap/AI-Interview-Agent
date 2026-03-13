import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaFire, FaTrophy, FaMedal } from "react-icons/fa";
import Navbar from "../components/Navbar";
import { showApiError } from "../utils/errorHandler";
import apiClient from "../utils/apiClient";

const MODES = [
    { key: "score", label: "Top Scores" },
    { key: "streak", label: "Longest Streaks" },
];

const rankIcon = (rank) => {
    if (rank === 1) return <FaTrophy className="text-yellow-400" />;
    if (rank === 2) return <FaMedal className="text-slate-300" />;
    if (rank === 3) return <FaMedal className="text-amber-600" />;
    return <span className="text-slate-500 font-bold text-sm">#{rank}</span>;
};

const planColor = (plan) => {
    if (plan === "pro-monthly") return "text-violet-400";
    if (plan === "starter-monthly") return "text-blue-400";
    return "text-slate-500";
};

const Leaderboard = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState("score");
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/interview/leaderboard?mode=${mode}&limit=20`);
                setEntries(res.data);
            } catch (error) {
                showApiError(error, "Failed to load leaderboard.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [mode]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white">
            <Navbar dark />
            <div className="max-w-3xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FaTrophy className="text-yellow-400" /> Leaderboard
                        </h1>
                        <p className="text-slate-400 text-sm">Top performers across the platform</p>
                    </div>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 mb-6">
                    {MODES.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${
                                mode === m.key
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center items-center h-52">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center text-slate-400 py-20">
                        No data yet. Complete interviews to appear here!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition
                                    ${entry.rank <= 3
                                        ? "border-yellow-500/30 bg-yellow-500/5"
                                        : "border-white/10 bg-white/5"
                                    }`}
                            >
                                {/* Rank */}
                                <div className="w-8 flex justify-center text-lg">
                                    {rankIcon(entry.rank)}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                                    {entry.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>

                                {/* Name + plan */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white truncate">{entry.name}</p>
                                    {entry.subscriptionPlan && entry.subscriptionPlan !== "none" && (
                                        <p className={`text-xs ${planColor(entry.subscriptionPlan)}`}>
                                            {entry.subscriptionPlan}
                                        </p>
                                    )}
                                </div>

                                {/* Stats by mode */}
                                {mode === "score" ? (
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-400">{entry.bestScore}<span className="text-xs text-slate-500">/10</span></p>
                                        <p className="text-xs text-slate-500">avg {entry.avgScore} · {entry.totalInterviews} interviews</p>
                                        {entry.currentStreak > 0 && (
                                            <p className="text-xs text-orange-400">🔥 {entry.currentStreak} streak</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-orange-400 flex items-center gap-1 justify-end">
                                            <FaFire /> {entry.currentStreak}
                                        </p>
                                        <p className="text-xs text-slate-500">best: {entry.longestStreak} days</p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
