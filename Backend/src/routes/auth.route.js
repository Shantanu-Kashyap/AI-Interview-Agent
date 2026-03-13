import express from 'express';
import { applyReferralCode, googleAuth, logout } from '../controllers/auth.controller.js';
import isAuth from '../middlewares/isAuth.js';


const authRouter = express.Router();


authRouter.post('/google', googleAuth)
authRouter.get('/logout', logout)
authRouter.post('/apply-referral', isAuth, applyReferralCode)

export default authRouter;