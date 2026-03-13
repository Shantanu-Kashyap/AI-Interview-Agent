import React, { useEffect, useRef } from "react";
import femaleVideo from "../assets/videos/female-ai.mp4";
import maleVideo from "../assets/videos/male-ai.mp4";
import { useState } from "react";
import Timer from "../components/Timer";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { BsArrowRight } from "react-icons/bs";
import { motion } from "framer-motion";
import { showApiError } from "../utils/errorHandler";
import { showInfoToast, showSuccessToast } from "../utils/toast";
import apiClient from "../utils/apiClient";
import { useNavigate } from "react-router-dom";


const Step2Interview = ({ interviewData, onFinish = () => {} }) => {
  const questions = Array.isArray(interviewData?.questions)
    ? interviewData.questions
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
  const { interviewId, userName } = interviewData || {};
  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const recognitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const videoRef = useRef(null);
  const isMicOnRef = useRef(true);
  const isAIPlayingRef = useRef(false);
  const isRecognizingRef = useRef(false);

  const currentQuestion = questions[currentIndex] || {};
  const questionText =
    typeof currentQuestion === "string"
      ? currentQuestion 
      : currentQuestion.question || "Question is loading...";
  const currentTimeLimit = currentQuestion.timeLimit || 60;
  const getDraftKey = (index) => `interview-draft:${interviewId}:${index}`;
  const navigate = useNavigate();

  const sanitizeFeedbackText = (value) => {
    const raw = String(value || "").replace(/```json|```/gi, "").trim();
    if (!raw) return "";

    const explicitFeedback = raw.match(/\bfeedback\s*[:=]\s*(.+)$/i);
    if (explicitFeedback?.[1]) {
      return explicitFeedback[1]
        .replace(/[{}\[\]"]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    return raw
      .replace(/\b(confidence|communication|correctness|finalScore|final_score|score)\s*[:=]\s*[\d.]+[,;]?\s*/gi, "")
      .replace(/^\s*feedback\s*[:=]\s*/i, "")
      .replace(/[{}\[\]"]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };


  useEffect(() => {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    // Try known female voices first
    const femaleVoice =
      voices.find(v =>
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("female")
      );

    if (femaleVoice) {
      setSelectedVoice(femaleVoice);
      setVoiceGender("female");
      return;
    }

    const maleVoice =
      voices.find(v =>
        v.name.toLowerCase().includes("david") ||
        v.name.toLowerCase().includes("male") ||
        v.name.toLowerCase().includes("mark")
      );
    if (maleVoice) {
      setSelectedVoice(maleVoice);
      setVoiceGender("male");
      return;
    }
    setSelectedVoice(voices[0]);
    setVoiceGender("female");
  };

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}, []);

const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

/* -------- SPEAK FUNCTION -------- */

const speakText = (text) => {
  return new Promise((resolve) => {
    const safeText =
      typeof text === "string" ? text : text != null ? String(text) : "";

    if (!safeText.trim()) {
      resolve();
      return;
    }

    if (!window.speechSynthesis || !selectedVoice) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    // Add natural pauses after commas and periods
    const humanText = safeText
      .replace(/,/g, ", ... ")
      .replace(/\./g, ". ... ");
    const utterance = new SpeechSynthesisUtterance(humanText);
    utterance.voice = selectedVoice;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsAIPlaying(true);
      isAIPlayingRef.current = true;
      stopMic();
      videoRef.current?.play();
    };

    utterance.onend = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsAIPlaying(false);
      isAIPlayingRef.current = false;

      if (isMicOnRef.current) {
        startMic();
      }
      
      setTimeout(() => {
        setSubtitle("");
        resolve();
      }, 300);
    };

    utterance.onerror = () => {
      setIsAIPlaying(false);
      isAIPlayingRef.current = false;
      setSubtitle("");
      resolve();
    };

    setSubtitle(safeText);
    window.speechSynthesis.speak(utterance);
   
  });
};

useEffect(() => {
  if(!selectedVoice){
    return;
  }
  const runIntro = async () => {
  if (isIntroPhase) {

    await speakText(
      `Hi ${userName}, it's great to meet you today. I hope you're feeling confident and ready.`
    );

    await speakText(
      "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin."
    );
    setIsIntroPhase(false);
  }else if(questionText){
     await new Promise((r) => setTimeout(r, 800));

  // If last question (hard level)
  if (currentIndex === questions.length - 1) {
    await speakText("Alright, this one might be a bit more challenging.");
  }

  await speakText(questionText);

  if(isMicOn){
    startMic();
  }
  }
}
runIntro();

}, [selectedVoice, isIntroPhase, currentIndex, questionText, questions.length, userName]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isAIPlayingRef.current = isAIPlaying;
  }, [isAIPlaying]);

  useEffect(()=>{
    if(isIntroPhase)return;
    if(!currentQuestion)return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev -  1;
      });
    }, 1000);
    return () => clearInterval(timer);
  },[isIntroPhase, currentIndex]);

  useEffect(() => {
  if (!isIntroPhase && currentQuestion) {
    setTimeLeft(currentTimeLimit);
  }
}, [currentIndex, isIntroPhase, currentTimeLimit]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

useEffect(() => {
  if (!interviewId) return;

  try {
    const savedDraft = window.localStorage.getItem(getDraftKey(currentIndex));
    setAnswer(savedDraft || "");
  } catch {
    // Ignore storage exceptions in private mode/restricted environments.
  }
}, [interviewId, currentIndex]);

useEffect(() => {
  if (!interviewId || isIntroPhase) return;

  try {
    const key = getDraftKey(currentIndex);
    if (answer.trim()) {
      window.localStorage.setItem(key, answer);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage exceptions in private mode/restricted environments.
  }
}, [answer, currentIndex, interviewId, isIntroPhase]);


  //voice to text logic
 useEffect(() => {
  if (!("webkitSpeechRecognition" in window)) return;

  const recognition = new window.webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizingRef.current = true;
  };

  recognition.onend = () => {
    isRecognizingRef.current = false;
  };

  recognition.onerror = () => {
    isRecognizingRef.current = false;
  };

  recognition.onresult = (event) => {
    const transcript =
      event.results[event.results.length - 1][0].transcript;

    setAnswer((prev) => `${prev} ${transcript}`.trim());
  };

  recognitionRef.current = recognition;

}, []);

const startMic = (force = false) => {
  if (
    recognitionRef.current &&
    !isAIPlayingRef.current &&
    !isRecognizingRef.current &&
    (force || isMicOnRef.current)
  ) {
    try {   
         recognitionRef.current.start();
    } catch (error) {
      console.error("Speech recognition error:", error);
    }
  };
};

const stopMic = () => {
  if (recognitionRef.current && isRecognizingRef.current) {
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Speech recognition stop error:", error);
    }
  }
};

const toggleMic = () => {
  setIsMicOn((prev) => {
    const nextState = !prev;
    if (nextState) {
      startMic(true);
    } else {
      stopMic();
    }
    return nextState;
  });
};


const submitAnswer =async () => {
  if(isSubmitting || !answer.trim()) return;
  stopMic();
  setIsSubmitting(true);

  try {
    const res = await apiClient.post("/api/interview/submit-answer", {
      interviewId,
      questionIndex: currentIndex,
      answer,
      timeTaken:
        currentQuestion.timeLimit - timeLeft,
    });

    const cleanedFeedback = sanitizeFeedbackText(res.data.feedback);
    setFeedback(cleanedFeedback || "Feedback received.");
    setIsSubmitting(false);
    try {
      window.localStorage.removeItem(getDraftKey(currentIndex));
    } catch {
      // Ignore storage exceptions in private mode/restricted environments.
    }
    speakText(cleanedFeedback || "Feedback received.");
    
  } catch (error) {
      showApiError(error, "We could not submit your answer. Please try again.", {
        actionLabel: "Retry",
        onAction: submitAnswer,
      });
     setIsSubmitting(false);
     speakText("Sorry, there was an error submitting your answer. Please try again.");
  }
}


const handleNext = async () => {
  try {
    window.localStorage.removeItem(getDraftKey(currentIndex));
  } catch {
    // Ignore storage exceptions in private mode/restricted environments.
  }

  setAnswer("");
  setFeedback("");

  if (currentIndex + 1 >= questions.length) {
    finishInterview();
    return;
  }

  await speakText("Alright, let's move to the next question.");

  setCurrentIndex(currentIndex + 1);
};

const finishInterview = async () => {
  stopMic();
  try {
    const res= await apiClient.post("/api/interview/finish", {
      interviewId,
    });
  onFinish(res.data);

  try {
    for (let i = 0; i < questions.length; i += 1) {
      window.localStorage.removeItem(getDraftKey(i));
    }
  } catch {
    // Ignore storage exceptions in private mode/restricted environments.
  }
  
  const finalFeedback = res.data.finalFeedback || "Thank you for completing the interview. We will get back to you soon.";
  setFeedback(finalFeedback);
  showSuccessToast("Interview completed. Your final report is ready.", {
    actionLabel: "View Report",
    onAction: () => navigate(`/report/${interviewId}`),
  });
  speakText(finalFeedback); 
    
  } catch (error) {
      showApiError(error, "Unable to finish interview right now. Please try again.", {
        actionLabel: "Retry",
        onAction: finishInterview,
      });
      speakText("Sorry, there was an error finishing the interview. Please try again.");

  }
}

useEffect(() => {
  if (isIntroPhase) return;
  if (!currentQuestion) return;

  if (timeLeft === 0 && !isSubmitting && !feedback) {
    submitAnswer();
  }
}, [timeLeft, isIntroPhase, isSubmitting, feedback]);

useEffect(() => {
  return () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.abort();
    }

    window.speechSynthesis.cancel();
  };
}, []);

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Preparing interview...
      </div>
    );
  }



  return (
    <div className="h-screen overflow-hidden bg-linear-to-br from-emerald-50 via-white to-teal-100 flex flex-col items-center justify-start px-4 pt-24 pb-4 sm:px-6 sm:pt-26 sm:pb-6">
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[95vw] max-w-3xl rounded-2xl border border-emerald-200 bg-white/95 px-4 py-2 shadow-md backdrop-blur">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Question</p>
            <p className="font-semibold text-emerald-700">{currentIndex + 1}/{questions.length}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Time Left</p>
            <p className="font-semibold text-emerald-700">{timeLeft}s</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Mic</p>
            <p className="font-semibold text-emerald-700">{isMicOn ? "On" : "Off"}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500">Network</p>
            <p className={`font-semibold ${isOnline ? "text-emerald-700" : "text-rose-600"}`}>
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-350 h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-9.5rem)] min-h-0 bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">
        {/* video section */}

        <div className="w-full lg:w-[35%] min-h-0 bg-white flex flex-col items-center p-6 gap-6 border-r border-gray-200 overflow-hidden">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl shrink-0">
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-contain object-top"
            />
          </div>

          <div className="w-full max-w-md flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">

          {/* subtitle .. */}
          {subtitle && (
            <div className='w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm'>
              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}


          {/* timer area */}
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Interview Status</span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  {isAIPlaying ? "In Progress" : "Completed"}
                </span>
              )}
            </div>

            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion.timeLimit || 60}
              />
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div className="">
                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-500">Current Question</span>
              </div>
              <div className="">
                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>
                <span className="text-xs text-gray-500">Total Questions</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* text section */}
        <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 md:p-8 relative overflow-y-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>

         {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                {`Question ${currentIndex + 1} of ${questions.length}`}
              </p>

            <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed pr-16">
              {questionText}
            </div>
          </div>
          )}


          <textarea
            placeholder="Type your answer here..."
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />

          {!feedback && (
            <p className="mt-2 text-xs text-gray-400">Draft autosaves on this device while you answer.</p>
          )}

          {!feedback ? (<div className="flex items-center gap-4 mt-6">
            <button
            onClick={toggleMic}
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg">
              {isMicOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
            </button>

            <button
            onClick={submitAnswer}
            disabled={isSubmitting || !answer.trim()}
            className="flex-1 bg-linear-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500">
              {isSubmitting?"Submitting...": "Submit Answer"}
            </button>
          </div>
        ):(
          <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className='mt-6 bg-emerald-50 border border-emerald-200 p-5
               rounded-2xl shadow-sm'>
               <p className='text-emerald-700 font-medium mb-4'>{feedback}</p>
             
               <button
                onClick={handleNext}
                className='w-full bg-linear-to-r from-emerald-600
               to-teal-500 text-white py-3 rounded-xl shadow-md
               hover:opacity-90 transition flex items-center justify-center gap-1'>Next Question <BsArrowRight size={18}/> </button>

        </motion.div>
          
        ) }

        </div>
      </div>
    </div>
  );
};
export default Step2Interview;
