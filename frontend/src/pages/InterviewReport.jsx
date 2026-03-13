import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { serverURL } from '../App';
import Step3Report from '../components/Step3Report';
import { useEffect } from 'react';
import axios from 'axios';
import { showApiError } from '../utils/errorHandler';


const InterviewReport = () => {

  const { id } = useParams();
  const [report, setReport] = useState(null);


  useEffect(()=>{
    const fetchReport= async ()=>{
      try{
       const res = await axios.get(serverURL + `/api/interview/report/${id}`, { withCredentials: true });
       setReport(res.data);

      } catch(error){
        showApiError(error, "Unable to load the interview report right now.");
      }
    }
    fetchReport();
  },[])
  
  if (!report) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-lg">
        Loading Report...
      </p>
    </div>
  );
}


  return <Step3Report report={report}/>
}

export default InterviewReport