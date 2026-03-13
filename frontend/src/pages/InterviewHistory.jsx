import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { showApiError } from "../utils/errorHandler";
import apiClient from "../utils/apiClient";

const InterviewHistory = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getMyInterviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/interview/get-interview");
      setInterviews(res.data.interviews || []);
    } catch (error) {
      showApiError(error, "Unable to load interview history right now.", {
        actionLabel: "Retry",
        onAction: getMyInterviews,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMyInterviews();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 py-10">
      <div className="w-[90vw] lg:w-[70vw] max-w-[90%] mx-auto">
        <div className="mb-10 w-full flex items-start gap-4 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="mt-1 p-3 rounded-full bg-white shadow hover:shadow-md transition"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>

          <div>
            <h1 className="text-3xl font-bold flex-nowrap text-gray-800">
              Interview History
            </h1>

            <p className="text-gray-500 mt-2">
              Track your past interviews and performance reports
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-10 rounded-2xl shadow text-center">
            <p className="text-gray-500">Loading your interview history...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow text-center">
            <p className="text-gray-700 text-lg font-semibold">No interviews yet</p>
            <p className="text-gray-500 mt-2">Start your first mock interview and track growth over time.</p>
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => navigate("/interview")}
                className="rounded-xl bg-black px-5 py-2 text-white hover:opacity-90"
              >
                Start First Interview
              </button>
              <button
                onClick={() => navigate("/interview")}
                className="rounded-xl border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-100"
              >
                Try Resume-Based Round
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {interviews.map((item) => (
              <div
                key={item._id || item.id}
                className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                onClick={() =>
                  navigate(`/report/${item._id || item.id}`)
                }
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.role}
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      {item.experience} • {item.mode}
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* SCORE */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">
                        {item.finalScore || 0}/10
                      </p>
                      <p className="text-xs text-gray-400">Overall Score</p>
                    </div>

                    {/* STATUS BADGE */}
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-medium ${
                        item.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status === "completed" ? "Completed" : "Incomplete"}
                    </span>
                  </div>  
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewHistory;
