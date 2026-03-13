import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { serverURL } from '../App';
import Step3Report from '../components/Step3Report';
import { useEffect } from 'react';
import axios from 'axios';


const InterviewReport = () => {

  const { id } = useParams();
  const [report, setReport] = useState(null);


  useEffect(()=>{
    const fetchReport= async ()=>{
      try{
       const res = await axios.get(serverURL + `/api/interview/report/${id}`, { withCredentials: true });
       setReport(res.data);
       console.log(res.data);

      } catch(error){
        console.error("Error fetching report", error);
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