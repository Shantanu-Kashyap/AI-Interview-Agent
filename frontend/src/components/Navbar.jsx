import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from "motion/react"
import { BsRobot, BsCoin } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { serverURL } from '../App';
import axios from 'axios';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';

const Navbar = () => {

    const {userData} = useSelector((state)=>state.user);    
    const [showCreditPopup, setShowCreditPopup] = useState(false);
    const [showUserPopup, setShowUserPopup] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const handleLogout =async ()=>{
        try {
            await axios.get(serverURL + '/api/auth/logout', { withCredentials: true });
            dispatch(setUserData(null));
            setShowCreditPopup(false);
            setShowUserPopup(false);
            navigate('/');

        } catch (error) {
            console.error("Logout error:", error);
        }
    }

  return (
    <div className='bg-[#f3f3f3] flex justify-center px-4 pt-6'>

        <motion.div
         initial={{ opacity: 0, y: -40 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className='w-full max-w-7xl flex items-center justify-between px-8 py-4 bg-white rounded-[24px] shadow-sm border border-gray-200 relative'>
          
          <div className='flex items-center gap-3 cursor-pointer'>
            <div className='bg-black text-white p-2 rounded-lg'>
               <BsRobot size={19} /> 
            </div>
            <h1 className='font-semibold hidden md:block text-lg'>InterviewIQ.AI</h1>
          </div>

          <div className='flex items-center gap-6 relative'>
            <div className='relative'>
                <button
                 onClick={() => {
                     if(!userData){
                     setShowAuth(true);
                     return;
                 }
                    setShowCreditPopup(!showCreditPopup); setShowUserPopup(false)}}
                    className='flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-md hover:bg-gray-200 transition'> 
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
                className='w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-semibold'>
                {userData ? (userData?.name?.slice(0,1) || 'U').toUpperCase() : <FaUserAstronaut size={16} />}
               </button>
               {showUserPopup && (
                <div className='absolute right-0 mt-3 w-48 bg-white shadow-xl border border-gray-200 rounded-xl p-4'>
                    <p className='text-md text-blue-500 font-medium mb-1'>{userData?.name}</p>
                    <button
                     onClick={()=>navigate("/history")}
                     className='w-full text-left text-sm hover:text-black text-gray-600'>
                        Interview History
                    </button>

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