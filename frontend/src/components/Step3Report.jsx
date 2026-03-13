import React, { useMemo, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ResponsiveContainer } from "recharts";
import { AreaChart } from "recharts";
import { CartesianGrid } from "recharts";
import { XAxis } from "recharts";
import { YAxis } from "recharts";
import { Area } from "recharts";
import { Tooltip } from "recharts";
import { Legend } from "recharts";
import { RadarChart } from "recharts";
import { PolarGrid } from "recharts";
import { PolarAngleAxis } from "recharts";
import { PolarRadiusAxis } from "recharts";
import { Radar } from "recharts";
import { LineChart } from "recharts";
import { Line } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { showSuccessToast, showErrorToast } from "../utils/toast";

const Step3Report = ({
  report,
  analytics,
  trendScope = "role",
  onTrendScopeChange = () => {},
  trendWindow = "5",
  onTrendWindowChange = () => {},
  onCreateShareLink,
  isPublicView = false,
}) => {
  const navigate = useNavigate();

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading Report...</p>
      </div>
    );
  }

  const {
    finalScore = 0,
    confidence = 0,
    communication = 0,
    correctness = 0,
    questionWiseScore = [],
  } = report;

  const trendData = analytics?.trendData || [];
  const benchmark = analytics?.benchmark || {};
  const skillHeatmap = analytics?.skillHeatmap || [];
  const questionTopicScores = analytics?.questionTopicScores || [];
  const scopeMeta = analytics?.scopeMeta || {};
  const recruiterSummary = analytics?.recruiterSummary || {};
  const [selectedTopic, setSelectedTopic] = useState("");

  const questionScoreData = questionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: score.score || 0,
  }));

  const radarData = [
    { subject: "Confidence", value: confidence },
    { subject: "Communication", value: communication },
    { subject: "Correctness", value: correctness },
  ];

  const topicOptions = useMemo(() => skillHeatmap.map((item) => item.topic), [skillHeatmap]);
  const activeTopic = selectedTopic || topicOptions[0] || "";
  const topicQuestionRows = questionTopicScores.filter((item) => item.topic === activeTopic);
  const trendChartData = trendData.map((item, index) => ({
    attempt: `A${index + 1}`,
    finalScore: item.finalScore,
    confidence: item.confidence,
    communication: item.communication,
    correctness: item.correctness,
  }));

  const skills = [
    { label: "Confidence", value: confidence },
    { label: "Communication", value: communication },
    { label: "Correctness", value: correctness },
  ];

  let performanceText = "";
  let shortTagline = "";

  if (finalScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (finalScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = finalScore;
  const percentage = (score / 10) * 100;

  const getScoreBand = (value) => {
    if (value >= 8) return { label: "Excellent", style: "bg-emerald-100 text-emerald-700" };
    if (value >= 6) return { label: "Good", style: "bg-amber-100 text-amber-700" };
    return { label: "Needs Work", style: "bg-rose-100 text-rose-700" };
  };

  const downloadPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 25;

  // ================== TITLE ==================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(34, 197, 94);

  doc.text("AI Interview Performance Report", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 5;

// underline
doc.setDrawColor(34, 197, 94);
doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

currentY += 15;

// ================= FINAL SCORE BOX =================
doc.setFillColor(240, 253, 244);
doc.roundedRect(margin, currentY, contentWidth, 20, 4, 4, "F");


doc.setFontSize(14);
doc.setTextColor(0, 0, 0);
doc.text(
  `Final Score: ${finalScore}/10`,
  pageWidth / 2,
  currentY + 12,
  { align: "center" }
);

currentY += 30;

// ================= SKILLS BOX =================
doc.setFillColor(249, 250, 251);
doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, "F");
doc.setFontSize(12);

doc.text(`Confidence: ${confidence}`, margin + 10, currentY + 10);
doc.text(`Communication: ${communication}`, margin + 10, currentY + 18);
doc.text(`Correctness: ${correctness}`, margin + 10, currentY + 26);

currentY += 45;

// ================= ADVICE =================
let advice = "";

if (finalScore >= 8) {
  advice =
    "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
} else if (finalScore >= 5) {
  advice =
    "Good foundation shown. Improve clarity and structure. Practice delivering concise, confident answers with stronger support.";
} else{
  advice = 
    "Significant improvement required. Focus on structured thinking, clarity, and confident delivery. Practice answering aloud regularly. ";
}
doc.setFillColor(255, 255, 255);
doc.setDrawColor(220);
doc.roundedRect(margin, currentY, contentWidth, 35, 4, 4);

doc.setFont("helvetica", "bold");
doc.text("Professional Advice", margin + 10, currentY + 10);

doc.setFont("helvetica", "normal");
doc.setFontSize(11);

const splitAdvice = doc.splitTextToSize(advice, contentWidth - 20);
doc.text(splitAdvice, margin + 10, currentY + 20);

currentY += 50;

// ------------------ QUESTION TABLE ------------------

autoTable(doc, {
  startY: currentY,
  margin: { left: margin, right: margin },
head: [["#", "Question", "Score", "Feedback"]],
body: questionWiseScore.map((q, i) => [
  `${i + 1}`,
  q.question || q.q || "Question not available",
  `${q.score}/10`,
  q.feedback,
]),
styles: {
  fontSize: 9,
  cellPadding: 5,
  valign: "top",
},
headStyles: {
  fillColor: [34, 197, 94],
  textColor: 255,
  halign: "center",
},        
columnStyles: {
  0: { cellWidth: 10, halign: "center" }, // index
  1: { cellWidth: 55 },                   // question
  2: { cellWidth: 20, halign: "center" }, // score
  3: { cellWidth: "auto" },               // feedback
},
alternateRowStyles: {
  fillColor: [249, 250, 251],
},
});

doc.save("AI_Interview_Report.pdf");
};

  const copyShareLink = async () => {
    if (typeof onCreateShareLink === "function") {
      onCreateShareLink();
      return;
    }

    try {
      await window.navigator.clipboard.writeText(window.location.href);
      showSuccessToast("Report link copied. You can share it now.");
    } catch {
      showErrorToast("Unable to copy link. Please copy from browser URL.");
    }
  };

  const emailReport = () => {
    const subject = encodeURIComponent("My InterviewIQ.AI Report");
    const body = encodeURIComponent(`Here is my interview report link:\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-green-50 px sm:px-6 lg:px-10 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="mid:mb-10 w-full flex items-start gap-4">
          <button
            onClick={() => navigate("/history")}
            className="mt-1 p-3 rounded-full bg-white shadow hover:shadow-md transition"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>

          <div>
            <h1 className="text-3xl font-bold flex-nowrap text-gray-800">
              Interview Analytics Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              AI-powered performance insights
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPublicView && (
            <button
              onClick={copyShareLink}
              className="border border-gray-300 bg-white text-gray-700 p-3 rounded-xl shadow-sm transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap"
            >
              Copy Share Link
            </button>
          )}
          <button
            onClick={emailReport}
            className="border border-gray-300 bg-white text-gray-700 p-3 rounded-xl shadow-sm transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap"
          >
            Email Report
          </button>
          <button
            onClick={downloadPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl shadow-md transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 text-center"
          >
            <h3 className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">
              Overall Performance{" "}
            </h3>
            <div className="relative w-20 h-20 sm:w-25 sm:h-20 mx-auto">
              <CircularProgressbar
                value={percentage}
                text={`${score}/10`}
                styles={buildStyles({
                  textSize: "18px",
                  pathColor: "#10b981",
                  textColor: "#ef4444",
                  trailColor: "#e5e7eb",
                })}
              />
            </div>

            <div className="mt-6">
              <p className="font-semibold text-gray-800 text-sm sm:text-base">
                {performanceText}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {shortTagline}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
              Skill Evaluation
            </h3>

            <div className="space-y-5">
              {skills.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2 text-sm sm:text-base">
                    <span>{s.label}</span>
                    <span className="font-semibold text-green-600">
                      {s.value}
                    </span>
                  </div>

                  <div className="bg-gray-200 h-2 sm:h-3 rounded-full">
                    <div
                      className="bg-green-500 h-full rounded-full"
                      style={{ width: `${s.value * 10}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Question-Level Radar
            </h3>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} />
                  <Radar name="Score" dataKey="value" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Performance Trend
            </h3>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={questionScoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#bbf7d0"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Trend Across Attempts
            </h3>

            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { key: "role", label: `Role: ${scopeMeta.role || report.role || "Current"}` },
                { key: "mode", label: `Mode: ${scopeMeta.mode || report.mode || "Current"}` },
                { key: "overall", label: "Overall" },
              ].map((scopeItem) => (
                <button
                  key={scopeItem.key}
                  onClick={() => onTrendScopeChange(scopeItem.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    trendScope === scopeItem.key
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {scopeItem.label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { key: "5", label: "Last 5" },
                { key: "10", label: "Last 10" },
                { key: "all", label: "All" },
              ].map((windowItem) => (
                <button
                  key={windowItem.key}
                  onClick={() => onTrendWindowChange(windowItem.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    trendWindow === windowItem.key
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {windowItem.label}
                </button>
              ))}
            </div>

            {trendData.length ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="attempt" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="finalScore" stroke="#059669" strokeWidth={3} />
                    <Line type="monotone" dataKey="confidence" stroke="#0ea5e9" strokeWidth={2} />
                    <Line type="monotone" dataKey="communication" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="correctness" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Complete more interviews to view trend analysis.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Benchmarking Snapshot
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Current Score</p>
                <p className="text-2xl font-bold text-emerald-600">{benchmark.currentScore ?? finalScore}/10</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Avg of Last 5</p>
                <p className="text-2xl font-bold text-gray-800">{benchmark.avgLastFive ?? 0}/10</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Percentile Band</p>
                <p className="text-xl font-bold text-gray-800">{benchmark.percentileBand || "N/A"}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Role Percentile ({scopeMeta.role || report.role || "Current"})</p>
                <p className="text-xl font-bold text-emerald-700">{benchmark.rolePercentileBand || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Mode Percentile ({scopeMeta.mode || report.mode || "Current"})</p>
                <p className="text-xl font-bold text-emerald-700">{benchmark.modePercentileBand || "N/A"}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Delta vs recent average: <span className={`font-semibold ${(benchmark.deltaFromAvg || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {(benchmark.deltaFromAvg || 0) >= 0 ? "+" : ""}{benchmark.deltaFromAvg || 0}
              </span>
            </p>

            {trendChartData.length > 1 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { key: "confidence", label: "Confidence", color: "#0ea5e9" },
                  { key: "communication", label: "Communication", color: "#f59e0b" },
                  { key: "correctness", label: "Correctness", color: "#8b5cf6" },
                ].map((item) => (
                  <div key={item.key} className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs text-gray-500 mb-2">{item.label} Trend</p>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                          <Line type="monotone" dataKey={item.key} stroke={item.color} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Skill Heatmap
            </h3>

            <p className="text-xs text-gray-500 mb-3">Green = strong, Amber = moderate, Red = weak</p>

            {skillHeatmap.length ? (
              <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skillHeatmap.map((item) => {
                  const tone = item.score >= 8
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : item.score >= 6
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-rose-100 text-rose-700 border-rose-200";

                  return (
                    <button key={item.topic} onClick={() => setSelectedTopic(item.topic)} className={`rounded-xl border p-3 text-left ${tone} ${activeTopic === item.topic ? "ring-2 ring-emerald-400" : ""}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide">{item.topic}</p>
                      <p className="mt-1 text-xl font-bold">{item.score}/10</p>
                    </button>
                  );
                })}
              </div>

              {activeTopic && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-700">Topic Drill-down: {activeTopic}</h4>
                  {topicQuestionRows.length ? (
                    <div className="mt-3 space-y-2">
                      {topicQuestionRows.map((row) => (
                        <div key={`${row.topic}-${row.index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-400">Question {row.index}</p>
                          <p className="text-sm font-medium text-gray-700">{row.question}</p>
                          <p className="text-xs text-emerald-600 mt-1">Score: {row.score}/10</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">No questions mapped to this topic.</p>
                  )}
                </div>
              )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No topic heatmap available yet.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Recruiter-Style Summary
            </h3>

            <p className="text-sm font-medium text-gray-800">{recruiterSummary.headline || "Summary will appear after first completed interview."}</p>

            {Array.isArray(recruiterSummary.strengths) && recruiterSummary.strengths.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-emerald-700 mb-2">Strengths</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {recruiterSummary.strengths.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(recruiterSummary.improvements) && recruiterSummary.improvements.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">Improvements</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {recruiterSummary.improvements.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
            )}

            {recruiterSummary.recommendation && (
              <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                {recruiterSummary.recommendation}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
              Question Breakdown
            </h3>

            <div className="space-y-6">
              {questionWiseScore.map((q, i) => (
                <div
                  key={i}
                  className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200"
                >
                  {(() => {
                    const band = getScoreBand(q.score ?? 0);
                    return (
                      <div className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${band.style}`}>
                        {band.label}
                      </div>
                    );
                  })()}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400">Question {i + 1}</p>

                      <p className="font-semibold text-gray-800 text-sm sm:text-base leading-relaxed">
                        {q.question || "Question not available"}
                      </p>
                    </div>

                    <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold text-xs sm:text-sm w-fit">
                      {q.score ?? 0}/10
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-xs text-green-600 font-semibold mb-1">
                      AI Feedback
                    </p>

                    <p className="text-sm text-gray-700 leading-relaxed">
                      {q.feedback && q.feedback.trim() !== ""
                        ? q.feedback
                        : "No feedback available for this question."}
                    </p>
                  </div>

                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Step3Report;
