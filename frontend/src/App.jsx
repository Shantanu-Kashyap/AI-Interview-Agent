import React, { useEffect } from 'react'
import { Routes } from 'react-router-dom'
import { Route } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import InterviewPage from './pages/InterviewPage'
import InterviewHistory from './pages/InterviewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'
import SharedReport from './pages/SharedReport'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'
import { showApiError } from './utils/errorHandler'
import ToastViewport from './components/ToastViewport'
import { showInfoToast } from './utils/toast'
import apiClient from './utils/apiClient'

export const serverURL = 'https://ai-interview-agent-px6a.onrender.com'

const App = () => {

  const dispatch = useDispatch();
 
   useEffect(()=>{
   const getUser = async ()=>{
     try {
      const result = await apiClient.get('/api/user/current-user');
      dispatch(setUserData(result.data));

     } catch (error) {
      const status = error?.response?.status;
      if (status !== 401) {
        showApiError(error, "Unable to load your account right now.");
      }
      dispatch(setUserData(null));
     }
   }
   getUser();
   }, [dispatch])

  useEffect(() => {
    const handleOffline = () => {
      showInfoToast("You are offline. Some actions may not work until connection is back.");
    };

    const handleOnline = () => {
      showInfoToast("Back online. You can continue your interview.");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <>
      <ToastViewport />
      <Routes>
      
      <Route path='/' element={<Home />} />
      <Route path='/auth' element={<Auth />} />
      <Route path='/interview' element={<InterviewPage />} />
      <Route path='/history' element={<InterviewHistory />} />
      <Route path='/pricing' element={<Pricing />} />
      <Route path='/report/:id' element={<InterviewReport />} />
      <Route path='/shared-report/:token' element={<SharedReport />} />
      <Route path='/leaderboard' element={<Leaderboard />} />
      <Route path='/admin' element={<Admin />} />

      </Routes>
    </>
  )
}

export default App
