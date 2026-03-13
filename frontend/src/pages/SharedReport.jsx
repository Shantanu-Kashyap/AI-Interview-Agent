import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Step3Report from "../components/Step3Report";
import apiClient from "../utils/apiClient";
import { showApiError } from "../utils/errorHandler";

const SharedReport = () => {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSharedReport = async () => {
      try {
        const res = await apiClient.get(`/api/interview/public/${token}`);
        setReport(res.data.report);
        setAnalytics(res.data.analytics);
      } catch (error) {
        showApiError(error, "This shared report link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    loadSharedReport();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading shared report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow">
          <h2 className="text-2xl font-semibold text-gray-800">Shared report unavailable</h2>
          <p className="mt-2 text-gray-500">The link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  return <Step3Report report={report} analytics={analytics} isPublicView />;
};

export default SharedReport;
