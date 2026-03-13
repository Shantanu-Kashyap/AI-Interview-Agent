import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaUserTie,
  FaBriefcase,
  FaFileUpload,
  FaMicrophoneAlt,
  FaChartLine,
} from "react-icons/fa";
import { FaBolt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { showApiError } from "../utils/errorHandler";
import { showSuccessToast } from "../utils/toast";
import apiClient from "../utils/apiClient";
import OnboardingWizard from "./OnboardingWizard";
import { useNavigate } from "react-router-dom";

const Step1SetUp = ({ onStart }) => {
  const {userData} = useSelector((state)=>state.user);
  const dispatch = useDispatch();
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [mode, setMode] = useState("Technical");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [resumeText, setResumeText] = useState("");
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  const roleTemplates = [
    {
      id: "sde-intern",
      title: "SDE Intern",
      role: "Software Development Engineer Intern",
      experience: "0-1 years",
      mode: "Technical",
      skills: ["JavaScript", "React", "Node.js", "DSA"],
      projects: ["Full-stack task manager", "REST API authentication module"],
    },
    {
      id: "frontend-dev",
      title: "Frontend Developer",
      role: "Frontend Developer",
      experience: "1-3 years",
      mode: "Technical",
      skills: ["React", "Redux", "CSS", "Performance Optimization"],
      projects: ["Responsive e-commerce UI", "Analytics dashboard"],
    },
    {
      id: "backend-dev",
      title: "Backend Developer",
      role: "Backend Developer",
      experience: "1-3 years",
      mode: "Technical",
      skills: ["Node.js", "Express", "MongoDB", "System Design"],
      projects: ["Payment service", "Job queue service"],
    },
    {
      id: "data-analyst",
      title: "Data Analyst",
      role: "Data Analyst",
      experience: "0-2 years",
      mode: "HR",
      skills: ["SQL", "Python", "Excel", "Data Visualization"],
      projects: ["Sales trend dashboard", "Customer retention analysis"],
    },
  ];

  useEffect(() => {
    const completed = window.localStorage.getItem("interview-onboarding-v1") === "done";
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const handleUploadResume = async () => {
    if (!resumeFile || analyzing) return;
    setAnalyzing(true);
    const formdata = new FormData();
    formdata.append("resume", resumeFile);
    try {
      const result = await apiClient.post(
        "/api/interview/resume",
        formdata,
      );
      setRole(result.data.role || "");
      setExperience(result.data.experience || "");
      setProjects(result.data.projects || []);
      setSkills(result.data.skills || []);
      setResumeText(result.data.resumeText || "");
      setAnalysisDone(true);
      showSuccessToast("Resume analyzed successfully. You can review extracted details below.");
      setAnalyzing(false);
    } catch (error) {
      showApiError(error, "We could not analyze your resume right now. Please try again.");
      setAnalyzing(false);
    }
  };

  const applyTemplate = (template) => {
    setRole(template.role);
    setExperience(template.experience);
    setMode(template.mode);
    setSkills(template.skills);
    setProjects(template.projects);
    setAnalysisDone(true);
    showSuccessToast(`${template.title} template applied.`);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await apiClient.post("/api/interview/generate-questions", {role, experience, mode, resumeText, projects, skills});
      if(userData){
        dispatch(setUserData({...userData, credits: result.data.creditsLeft}));
      }
      setLoading(false);
      onStart(result.data);

    } catch (error) {
      const backendMessage = `${error?.response?.data?.message || ""} ${error?.response?.data?.error || ""}`;
      if (/credit/i.test(backendMessage)) {
        showApiError(error, "Not enough credits to start interview.", {
          actionLabel: "Go to Pricing",
          onAction: () => navigate("/pricing"),
        });
      } else {
        showApiError(error, "Unable to start interview right now. Please try again.", {
          actionLabel: "Retry",
          onAction: handleStart,
        });
      }
      setLoading(false);
    }
  }

  return (
    <>
      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 px-4"
      >
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl grid md:grid-cols-2 overflow-hidden">
        <motion.div
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="relative bg-gradient-to-br from-green-50 to-green-100 p-12 flex flex-col justify-center"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Start Your AI Interview
          </h2>

          <p className="text-gray-600 mb-10">
            Practice real interview scenarios powered by AI. Improve
            communication, technical skills, and confidence.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: <FaUserTie className="text-green-600 text-xl" />,
                text: "Choose Role & Experience",
              },
              {
                icon: <FaMicrophoneAlt className="text-green-600 text-xl" />,
                text: "Smart Voice Interview",
              },
              {
                icon: <FaChartLine className="text-green-600 text-xl" />,
                text: "Performance Analytics",
              },
            ].map((item, index) => (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.15 }}
                whileHover={{ scale: 1.03 }}
                key={index}
                className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm cursor-pointer"
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <p className="text-gray-600 font-medium">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="p-12 bg-white"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Interview SetUp
          </h2>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FaBolt className="text-emerald-600" /> Quick Role Templates
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roleTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <FaUserTie className="absolute top-4 left-4 text-gray-400" />
              <input
                type="text"
                placeholder="Desired Role (e.g. Software Engineer)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-400 outline-none transition border-gray-200"
              />
            </div>

            <div className="relative">
              <FaBriefcase className="absolute top-4 left-4 text-gray-400" />
              <input
                type="text"
                placeholder="Experience (e.g. 2 years)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-400 outline-none transition border-gray-200"
              />
            </div>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full py-3 px-4 border rounded-xl focus:ring-2 focus:ring-green-400 outline-none transition border-gray-200"
            >
              <option value="Technical">Technical</option>
              <option value="HR">HR Interview</option>
            </select>

            {!analysisDone && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => document.getElementById("resumeUpload").click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition"
              >
                <FaFileUpload className="text-4xl mx-auto text-green-600 mb-3" />

                <input
                  type="file"
                  accept="application/pdf"
                  id="resumeUpload"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                />

                <p className="text-gray-600 font-medium">
                  {resumeFile
                    ? resumeFile.name
                    : "Click to upload resume (Optional)"}
                </p>

                {resumeFile && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadResume();
                    }}
                    whileHover={{ scale: 1.05 }}
                    className="mt-4 bg-gray-900 text-white py-2 px-5 rounded-lg hover:bg-gray-800 transition"
                  >
                    {analyzing ? "Analyzing..." : "Analyze Resume"}
                  </motion.button>
                )}
              </motion.div>
            )}

            {analysisDone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-800">
                  Resume Analysis Result
                </h3>

                {projects.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Projects:</p>

                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {projects.map((proj, idx) => (
                        <li key={idx}>{proj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                 {skills.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Skills:</p>

                    <div className="flex flex-wrap gap-2 text-gray-600">
                      {skills.map((skill, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 py-1 px-3 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}


              </motion.div>
            )}

            <motion.button
              onClick={handleStart}
              disabled={!role || !experience || loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="w-full disabled:bg-gray-600 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full text-lg font-semibold transition duration-300 shadow-md"
            >
              {loading ? "Starting..." : "Start Interview"}
            </motion.button>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default Step1SetUp;
