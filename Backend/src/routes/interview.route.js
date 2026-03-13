import express from 'express';
import isAuth from '../middlewares/isAuth.js';
import upload from '../middlewares/multer.js';
import { analyzeResume, createInterviewShareLink, finishInterview, generateQuestion, getInterviewAnalytics, getInterviewReport, getLeaderboard, getMyInterviews, getPublicInterviewReport, submitAnswer } from '../controllers/interview.controller.js';

const interviewRouter = express.Router();

interviewRouter.post('/resume', isAuth, upload.single('resume'), analyzeResume);
interviewRouter.post('/generate-questions', isAuth, generateQuestion);
interviewRouter.post('/submit-answer', isAuth, submitAnswer);
interviewRouter.post('/finish', isAuth, finishInterview);
interviewRouter.post('/share/:id', isAuth, createInterviewShareLink);
interviewRouter.get('/get-interview', isAuth, getMyInterviews);
interviewRouter.get('/leaderboard', getLeaderboard);
interviewRouter.get('/report/:id', isAuth, getInterviewReport);
interviewRouter.get('/analytics/:id', isAuth, getInterviewAnalytics);
interviewRouter.get('/public/:token', getPublicInterviewReport);

export default interviewRouter;

