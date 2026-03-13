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
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "https://ai-interview-agent-rose.vercel.app",
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow server-to-server calls and tools that don't send Origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
connectDB();


app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);


app.listen(process.env.PORT);