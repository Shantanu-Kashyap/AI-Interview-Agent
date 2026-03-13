import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Step3Report from '../components/Step3Report';
import { useEffect } from 'react';
import { showApiError } from '../utils/errorHandler';
import apiClient from '../utils/apiClient';
import { showSuccessToast } from '../utils/toast';


const InterviewReport = () => {

  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trendScope, setTrendScope] = useState("role");
  const [trendWindow, setTrendWindow] = useState("5");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const trendLimit = trendWindow === "all" ? 20 : Number(trendWindow);

  const fetchReport= async ()=>{
    setLoading(true);
    setHasError(false);
    try{
      const [reportRes, analyticsRes] = await Promise.all([
        apiClient.get(`/api/interview/report/${id}`),
        apiClient.get(`/api/interview/analytics/${id}?scope=${trendScope}&limit=${trendLimit}`),
      ]);
      setReport(reportRes.data);
      setAnalytics(analyticsRes.data);
    } catch(error){
      setHasError(true);
      showApiError(error, "Unable to load the interview report right now.", {
        actionLabel: "Retry",
        onAction: fetchReport,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCreateShareLink = async () => {
    try {
      const res = await apiClient.post(`/api/interview/share/${id}`);
      const link = `${window.location.origin}/shared-report/${res.data.token}`;
      await window.navigator.clipboard.writeText(link);
      showSuccessToast("Secure share link copied.");
    } catch (error) {
      showApiError(error, "Unable to create share link right now.", {
        actionLabel: "Retry",
        onAction: handleCreateShareLink,
      });
    }
  };

  useEffect(()=>{
    fetchReport();
  },[trendScope, trendWindow])
  
  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-lg">
        Loading Report...
      </p>
    </div>
  );
}

  if (hasError || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow">
          <h2 className="text-2xl font-semibold text-gray-800">Report not available</h2>
          <p className="mt-2 text-gray-500">
            You can retry now, or start a new interview to generate a fresh report.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button onClick={fetchReport} className="rounded-xl bg-black px-5 py-2 text-white hover:opacity-90">
              Retry
            </button>
            <button onClick={() => navigate("/interview")} className="rounded-xl border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-100">
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <Step3Report
      report={report}
      analytics={analytics}
      trendScope={trendScope}
      onTrendScopeChange={setTrendScope}
      trendWindow={trendWindow}
      onTrendWindowChange={setTrendWindow}
      onCreateShareLink={handleCreateShareLink}
    />
  )
}

export default InterviewReport