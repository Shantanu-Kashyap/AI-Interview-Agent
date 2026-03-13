import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from "motion/react"
import { BsRobot, BsCoin } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';
import { showApiError } from '../utils/errorHandler';
import apiClient from '../utils/apiClient';

const Navbar = ({ dark = false }) => {

    const {userData} = useSelector((state)=>state.user);    
    const [showCreditPopup, setShowCreditPopup] = useState(false);
    const [showUserPopup, setShowUserPopup] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const handleLogout =async ()=>{
        try {
            await apiClient.get('/api/auth/logout');
            dispatch(setUserData(null));
            setShowCreditPopup(false);
            setShowUserPopup(false);
            navigate('/');

        } catch (error) {
            showApiError(error, "Unable to logout right now. Please try again.");
        }
    }

  return (
    <div className={`flex justify-center px-4 pt-6 ${dark ? 'bg-transparent' : 'bg-[#f3f3f3]'}`}>

        <motion.div
         initial={{ opacity: 0, y: -40 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className={`w-full max-w-7xl flex items-center justify-between px-8 py-4 rounded-[24px] relative ${
             dark
                 ? 'bg-white/5 border border-white/10 backdrop-blur-md shadow-none'
                 : 'bg-white shadow-sm border border-gray-200'
         }`}>
          
          <div className='flex items-center gap-3 cursor-pointer' onClick={() => navigate('/')}>
            <div className={`p-2 rounded-lg ${dark ? 'bg-white/10 text-white' : 'bg-black text-white'}`}>
               <BsRobot size={19} /> 
            </div>
            <h1 className={`font-semibold hidden md:block text-lg ${dark ? 'text-white' : 'text-black'}`}>InterviewIQ.AI</h1>
          </div>

          <div className='flex items-center gap-6 relative'>
                        {!!userData?.currentStreak && (
                            <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${
                                dark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
                            }`}>
                                <span>🔥</span>
                                <span>{userData.currentStreak} day streak</span>
                            </div>
                        )}

                        {userData?.subscriptionPlan && userData.subscriptionPlan !== "none" && (
                            <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold ${
                                dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                <span>PRO</span>
                                <span>{userData.subscriptionPlan}</span>
                            </div>
                        )}

            <div className='relative'>
                <button
                 onClick={() => {
                     if(!userData){
                     setShowAuth(true);
                     return;
                 }
                    setShowCreditPopup(!showCreditPopup); setShowUserPopup(false)}}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-md transition font-medium ${
                        dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}> 
                    <BsCoin size={20} />
                    {userData?.credits || 0}
                </button>
                {showCreditPopup && (
                    <div className='absolute right-[-50px] mt-3 w-64 p-5 bg-white rounded-xl shadow-xl border border-gray-200 z-50'>
                        <p className='text-sm text-gray-600 mb-4'>Need more credits to continue interviews?</p>
                        <button
                        onClick={()=>navigate('/pricing')}
                         className='w-full py-2 bg-black text-white rounded-lg  text-sm'>Buy Credits</button>
                    </div>
                )}
             </div>

             <div className='relative'>
               <button
                onClick={() => {
                    if(!userData){
                        setShowAuth(true);
                        return;
                    }
                    setShowUserPopup(!showUserPopup); setShowCreditPopup(false)}}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
                    dark ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20' : 'bg-black text-white'
                } transition`}>
                {userData ? (userData?.name?.slice(0,1) || 'U').toUpperCase() : <FaUserAstronaut size={16} />}
               </button>
               {showUserPopup && (
                <div className='absolute right-0 mt-3 w-52 bg-white shadow-xl border border-gray-200 rounded-xl p-4'>
                    <p className='text-md text-blue-500 font-medium mb-1'>{userData?.name}</p>
                    <button
                     onClick={()=>{ navigate("/history"); setShowUserPopup(false); }}
                     className='w-full text-left text-sm hover:text-black text-gray-600 py-1'>
                        Interview History
                    </button>
                    <button
                     onClick={()=>{ navigate("/leaderboard"); setShowUserPopup(false); }}
                     className='w-full text-left text-sm hover:text-black text-gray-600 py-1'>
                        🏆 Leaderboard
                    </button>
                    {userData?.isAdmin && (
                        <button
                         onClick={()=>{ navigate("/admin"); setShowUserPopup(false); }}
                         className='w-full text-left text-sm hover:text-black text-violet-600 font-semibold py-1'>
                            ⚙️ Admin Dashboard
                        </button>
                    )}

                    <button
                     onClick={handleLogout}
                     className='w-full text-left text-sm py-2 text-red-500 flex items-center gap-2 hover:text-red-600'>
                        <HiOutlineLogout size={16} />
                        Logout
                    </button>

                </div>
               )}
            </div>

            </div>

        </motion.div>

        {showAuth && <AuthModel onClose={()=>setShowAuth(false)} />}

    </div>
  )
}

export default Navbar