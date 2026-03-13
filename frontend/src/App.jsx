import React, { useEffect } from 'react'
import { Routes } from 'react-router-dom'
import { Route } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import InterviewPage from './pages/InterviewPage'
import InterviewHistory from './pages/InterviewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'
import { showApiError } from './utils/errorHandler'
import ToastViewport from './components/ToastViewport'

export const serverURL = 'http://localhost:5000'

const App = () => {

  const dispatch = useDispatch();
 
   useEffect(()=>{
   const getUser = async ()=>{
     try {
      const result = await axios.get(`${serverURL}/api/user/current-user`, { withCredentials: true });
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

      </Routes>
    </>
  )
}

export default App