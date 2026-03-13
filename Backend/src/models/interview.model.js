import mongoose from 'mongoose'

const questionsSchema = new mongoose.Schema([
    {
        question: String,
        difficulty: String,
        timeLimit: Number,
        answer: String,
        feedback: String,
        score: { type: Number, default: 0 },
        confidence: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        correctness: { type: Number, default: 0 },
    }
]);

const interviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    experience: { type: String, required: true },
    mode: { type: String, enum: ['Technical', 'HR'], required: true },
    questions: [questionsSchema],
    resumeText: {
        type: String,
    },
    finalScore: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["Incompleted", "completed"],
        default: "Incompleted",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Interview = mongoose.model('Interview', interviewSchema);


export default Interview;