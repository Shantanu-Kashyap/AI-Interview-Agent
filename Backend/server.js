import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/db/db.js';
import authRouter from './src/routes/auth.route.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRouter from './src/routes/user.route.js';
import interviewRouter from './src/routes/interview.route.js';
import paymentRouter from './src/routes/payment.route.js';
import adminRouter from './src/routes/admin.route.js';
dotenv.config();


const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
connectDB();


app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);


app.listen(process.env.PORT);