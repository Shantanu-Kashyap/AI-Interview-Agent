import fs from 'fs';
import jwt from 'jsonwebtoken';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { askAI } from '../../services/openRouter.service.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';

const parseAiJson = (rawContent) => {
    const content = typeof rawContent === "string" ? rawContent.trim() : "";

    if (!content) {
        throw new Error("AI returned empty content");
    }

    // Handle markdown fenced JSON blocks.
    const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : content;

    // If extra text appears around JSON, try parsing the largest object block.
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    const jsonText = firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace
        ? candidate.slice(firstBrace, lastBrace + 1)
        : candidate;

    return JSON.parse(jsonText);
};

const clampScore = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(10, num));
};

const STOPWORDS = new Set([
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "were", "have",
    "has", "had", "into", "about", "how", "what", "when", "where", "why", "would", "could", "should",
    "their", "them", "they", "there", "then", "than", "just", "very", "been", "being", "will", "can",
    "our", "out", "not", "but", "also", "any", "all", "more", "most", "such", "only", "each", "some",
]);

const toKeywords = (text = "") => {
    return String(text)
        .toLowerCase()
        .match(/[a-z0-9]+/g)?.filter((word) => word.length > 2 && !STOPWORDS.has(word)) || [];
};

const getKeywordCoverage = (questionText = "", answer = "") => {
    const questionKeywords = [...new Set(toKeywords(questionText))];
    if (!questionKeywords.length) return 0;

    const answerKeywords = new Set(toKeywords(answer));
    const matched = questionKeywords.filter((word) => answerKeywords.has(word)).length;
    return matched / questionKeywords.length;
};

const buildHeuristicFeedback = ({ wordCount, coverage, communication }) => {
    if (wordCount < 8) {
        return "Answer is too short. Add your approach, reasoning, and one practical example.";
    }

    if (coverage < 0.2) {
        return "Your response misses key question points. Focus directly on asked problem details.";
    }

    if (coverage >= 0.45 && communication >= 7) {
        return "Strong relevance and clarity. Add measurable outcomes to make the answer interview-ready.";
    }

    if (communication < 5.5) {
        return "Good ideas, but structure is unclear. Use clear steps and concise language.";
    }

    return "Decent response. Improve with clearer structure, concrete examples, and sharper technical depth.";
};

// Extract clean feedback text - always strips score key-value pairs
const normalizeFeedback = (text) => {
    const raw = String(text || "").replace(/```json|```/gi, "").trim();

    // If AI returned "feedback: Some text..." style, extract just the value
    const feedbackMatch = raw.match(/\bfeedback\s*[:=]\s*(.+)/i);
    if (feedbackMatch) {
        const value = feedbackMatch[1].replace(/[{}\[\]"]/g, "").trim();
        if (value) return value;
    }

    // Strip any remaining score key-value tokens (e.g. "confidence: 9,")
    const stripped = raw
        .replace(/\b(confidence|communication|correctness|finalScore|final_score|score)\s*[:=]\s*[\d.]+[,;]?\s*/gi, "")
        .replace(/[{}\[\]"]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!stripped) return "Good attempt. Add concrete examples and structure to improve impact.";
    return stripped;
};

// Try to extract structured scores from "confidence: 9, communication: 8, ..." plain text
const tryParseKeyValues = (raw = "") => {
    const get = (key) => {
        const m = raw.match(new RegExp(`\\b${key}\\s*[:=]\\s*([\\d.]+)`, "i"));
        return m ? clampScore(parseFloat(m[1])) : null;
    };
    const confidence = get("confidence");
    const communication = get("communication");
    const correctness = get("correctness");
    const finalScore = get("finalScore") || get("final_score") || get("score");

    // Only use this parse if we found at least 2 numeric fields
    const found = [confidence, communication, correctness].filter((v) => v !== null);
    if (found.length < 2) return null;

    const c = confidence ?? found[0];
    const cm = communication ?? found[0];
    const cr = correctness ?? found[0];
    const fs = finalScore ?? Math.round((c + cm + cr) / 3);

    return { confidence: c, communication: cm, correctness: cr, finalScore: fs, feedback: normalizeFeedback(raw) };
};

const buildFallbackEvaluation = (answer = "", aiResponse = "", questionText = "") => {
    const wordCount = String(answer).trim().split(/\s+/).filter(Boolean).length;
    const coverage = getKeywordCoverage(questionText, answer);
    const sentenceCount = Math.max(1, String(answer).split(/[.!?]+/).filter((s) => s.trim().length).length);

    let base = 4;
    if (wordCount >= 120) base = 8;
    else if (wordCount >= 80) base = 7;
    else if (wordCount >= 45) base = 6;
    else if (wordCount >= 20) base = 5;
    else if (wordCount < 8) base = 2;

    if (coverage >= 0.45) base += 1;
    else if (coverage < 0.15) base -= 1;

    const avgWordsPerSentence = wordCount / sentenceCount;
    const communicationBoost = avgWordsPerSentence > 22 ? -0.5 : avgWordsPerSentence >= 8 ? 0.5 : 0;

    const confidence = clampScore(base);
    const communication = clampScore(base + communicationBoost);
    const correctness = clampScore(base + (coverage >= 0.35 ? 1 : coverage < 0.15 ? -1 : 0));
    const finalScore = Math.round((confidence + communication + correctness) / 3);
    const normalized = normalizeFeedback(aiResponse);

    const feedback = aiResponse && normalized !== "Good attempt. Add concrete examples and structure to improve impact."
        ? normalized
        : buildHeuristicFeedback({ wordCount, coverage, communication });

    return {
        confidence,
        communication,
        correctness,
        finalScore,
        feedback,
    };
};

const parseAnswerEvaluation = (aiResponse, answer, questionText = "") => {
    try {
        const parsed = parseAiJson(aiResponse);

        const confidence = clampScore(parsed.confidence);
        const communication = clampScore(parsed.communication);
        const correctness = clampScore(parsed.correctness);
        const parsedFinal = clampScore(parsed.finalScore);
        const finalScore = parsedFinal || Math.round((confidence + communication + correctness) / 3);

        return {
            confidence,
            communication,
            correctness,
            finalScore,
            feedback: normalizeFeedback(parsed.feedback || aiResponse),
        };
    } catch {
        // Try parsing "confidence: 9, ... feedback: ..." plain-text format before full fallback
        const kvResult = tryParseKeyValues(aiResponse);
        if (kvResult) return kvResult;
        return buildFallbackEvaluation(answer, aiResponse, questionText);
    }
};

const getInterviewAverages = (interview) => {
    const questions = Array.isArray(interview?.questions) ? interview.questions : [];
    if (!questions.length) {
        return {
            confidence: 0,
            communication: 0,
            correctness: 0,
        };
    }

    const totals = questions.reduce(
        (acc, q) => {
            acc.confidence += q?.confidence || 0;
            acc.communication += q?.communication || 0;
            acc.correctness += q?.correctness || 0;
            return acc;
        },
        { confidence: 0, communication: 0, correctness: 0 },
    );

    return {
        confidence: Number((totals.confidence / questions.length).toFixed(1)),
        communication: Number((totals.communication / questions.length).toFixed(1)),
        correctness: Number((totals.correctness / questions.length).toFixed(1)),
    };
};

const inferTopic = (question = "") => {
    const q = String(question).toLowerCase();
    const topicMatchers = [
        { topic: "DSA", keywords: ["array", "linked list", "tree", "graph", "algorithm", "time complexity", "space complexity", "binary search", "dp"] },
        { topic: "DBMS", keywords: ["sql", "database", "mongodb", "normalization", "index", "query", "transaction", "acid"] },
        { topic: "OOP", keywords: ["class", "object", "inheritance", "polymorphism", "encapsulation", "abstraction", "solid"] },
        { topic: "System Design", keywords: ["scalable", "architecture", "load balancer", "caching", "microservice", "system design", "throughput"] },
        { topic: "Frontend", keywords: ["react", "ui", "component", "css", "state", "hooks", "frontend", "html"] },
        { topic: "Backend", keywords: ["node", "api", "server", "express", "authentication", "middleware", "backend"] },
        { topic: "Behavioral", keywords: ["team", "conflict", "leadership", "challenge", "strength", "weakness", "communication", "collaboration"] },
    ];

    for (const matcher of topicMatchers) {
        if (matcher.keywords.some((kw) => q.includes(kw))) {
            return matcher.topic;
        }
    }

    return "General";
};

const getPercentileBand = (percentile) => {
    if (percentile >= 90) return "Top 10%";
    if (percentile >= 75) return "Top 25%";
    if (percentile >= 50) return "Top 50%";
    return "Needs Improvement";
};

const buildInterviewReportPayload = (interview) => {
    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
        totalConfidence += q.confidence || 0;
        totalCommunication += q.communication || 0;
        totalCorrectness += q.correctness || 0;
    });

    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
    const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

    return {
        interviewId: interview._id,
        role: interview.role,
        mode: interview.mode,
        experience: interview.experience,
        createdAt: interview.createdAt,
        finalScore: interview.finalScore,
        confidence: Number(avgConfidence.toFixed(1)),
        communication: Number(avgCommunication.toFixed(1)),
        correctness: Number(avgCorrectness.toFixed(1)),
        questionWiseScore: interview.questions,
    };
};

const buildInterviewAnalyticsPayload = async (interview, { scope = "role", limit = 6 } = {}) => {
    const normalizedScope = ["role", "mode", "overall"].includes(scope) ? scope : "role";
    const normalizedLimit = Math.min(Math.max(Number(limit) || 6, 3), 20);

    const currentAverages = getInterviewAverages(interview);
    const trendFilter = {
        userId: interview.userId,
        status: "completed",
    };

    if (normalizedScope === "role") {
        trendFilter.role = interview.role;
    } else if (normalizedScope === "mode") {
        trendFilter.mode = interview.mode;
    }

    const scopedInterviews = await Interview.find(trendFilter)
        .sort({ createdAt: -1 })
        .limit(normalizedLimit)
        .select("finalScore createdAt questions role mode");

    const trendData = scopedInterviews
        .map((item) => {
            const averages = getInterviewAverages(item);
            return {
                interviewId: item._id,
                createdAt: item.createdAt,
                finalScore: item.finalScore || 0,
                role: item.role,
                mode: item.mode,
                ...averages,
            };
        })
        .reverse();

    const lastFive = trendData.slice(-5);
    const avgLastFive = lastFive.length
        ? Number((lastFive.reduce((sum, item) => sum + (item.finalScore || 0), 0) / lastFive.length).toFixed(1))
        : 0;

    const allCompleted = await Interview.find({
        userId: interview.userId,
        status: "completed",
    }).select("finalScore role mode");

    const percentile = allCompleted.length
        ? Math.round(
            (allCompleted.filter((item) => (item.finalScore || 0) <= (interview.finalScore || 0)).length /
                allCompleted.length) *
                100,
        )
        : 0;

    const rolePool = allCompleted.filter((item) => item.role === interview.role);
    const modePool = allCompleted.filter((item) => item.mode === interview.mode);

    const getPercentileFromPool = (pool) => {
        if (!pool.length) return 0;
        return Math.round((pool.filter((item) => (item.finalScore || 0) <= (interview.finalScore || 0)).length / pool.length) * 100);
    };

    const rolePercentile = getPercentileFromPool(rolePool);
    const modePercentile = getPercentileFromPool(modePool);

    const topicScores = {};
    (interview.questions || []).forEach((q) => {
        const topic = inferTopic(q.question);
        if (!topicScores[topic]) {
            topicScores[topic] = { total: 0, count: 0 };
        }
        topicScores[topic].total += q.score || 0;
        topicScores[topic].count += 1;
    });

    const skillHeatmap = Object.entries(topicScores).map(([topic, value]) => ({
        topic,
        score: Number((value.total / value.count).toFixed(1)),
    }));

    const questionTopicScores = (interview.questions || []).map((q, index) => ({
        index: index + 1,
        question: q.question,
        topic: inferTopic(q.question),
        score: q.score || 0,
        feedback: q.feedback || "",
    }));

    const strengths = [];
    const improvements = [];
    const dimensionPairs = [
        { key: "confidence", label: "Confidence", value: currentAverages.confidence },
        { key: "communication", label: "Communication", value: currentAverages.communication },
        { key: "correctness", label: "Correctness", value: currentAverages.correctness },
    ].sort((a, b) => b.value - a.value);

    if (dimensionPairs[0]) {
        strengths.push(`Strongest dimension: ${dimensionPairs[0].label} (${dimensionPairs[0].value}/10)`);
    }

    if (dimensionPairs[2]) {
        improvements.push(`Focus next on ${dimensionPairs[2].label.toLowerCase()} to improve consistency.`);
    }

    const strongestTopic = [...skillHeatmap].sort((a, b) => b.score - a.score)[0];
    const weakestTopic = [...skillHeatmap].sort((a, b) => a.score - b.score)[0];

    if (strongestTopic) {
        strengths.push(`Good performance in ${strongestTopic.topic} (${strongestTopic.score}/10).`);
    }

    if (weakestTopic) {
        improvements.push(`Practice ${weakestTopic.topic} with 2 focused mock answers this week.`);
    }

    let headline = "Needs focused practice before high-stakes interviews.";
    if ((interview.finalScore || 0) >= 8) {
        headline = "Interview-ready profile with strong communication and technical clarity.";
    } else if ((interview.finalScore || 0) >= 6) {
        headline = "Promising performance with clear room for targeted improvement.";
    }

    return {
        scope: normalizedScope,
        scopeMeta: {
            role: interview.role,
            mode: interview.mode,
        },
        trendData,
        benchmark: {
            currentScore: interview.finalScore || 0,
            avgLastFive,
            deltaFromAvg: Number(((interview.finalScore || 0) - avgLastFive).toFixed(1)),
            percentile,
            percentileBand: getPercentileBand(percentile),
            rolePercentile,
            modePercentile,
            rolePercentileBand: getPercentileBand(rolePercentile),
            modePercentileBand: getPercentileBand(modePercentile),
        },
        skillHeatmap,
        questionTopicScores,
        recruiterSummary: {
            headline,
            strengths,
            improvements,
            recommendation:
                (interview.finalScore || 0) >= 8
                    ? "Proceed with advanced mock rounds and role-specific scenario practice."
                    : "Run 2 to 3 focused mocks on weak areas before the next real interview.",
        },
    };
};

const extractResumeDataFallback = (resumeText = "") => {
    const text = String(resumeText || "").replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();

    const roleHints = [
        ["frontend", "Frontend Developer"],
        ["backend", "Backend Developer"],
        ["full stack", "Full Stack Developer"],
        ["data analyst", "Data Analyst"],
        ["software engineer", "Software Engineer"],
        ["developer", "Software Developer"],
    ];

    let role = "Software Engineer";
    for (const [needle, label] of roleHints) {
        if (lower.includes(needle)) {
            role = label;
            break;
        }
    }

    const experienceMatch = text.match(/(\d+\+?\s*(?:years?|yrs?|months?))/i);
    const experience = experienceMatch ? experienceMatch[1] : "0-1 years";

    const knownSkills = [
        "JavaScript", "TypeScript", "React", "Node.js", "Express", "MongoDB", "SQL", "Python",
        "Java", "C++", "HTML", "CSS", "Redux", "Next.js", "REST API", "Git",
    ];
    const skills = knownSkills.filter((s) => lower.includes(s.toLowerCase())).slice(0, 8);

    const projectSegments = text
        .split(/\.|\n|;/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 20 && /(project|built|developed|implemented|created)/i.test(p))
        .slice(0, 3)
        .map((p) => (p.length > 120 ? `${p.slice(0, 117)}...` : p));

    return {
        role,
        experience,
        projects: projectSegments,
        skills,
    };
};

const buildFallbackQuestions = ({ role, mode, skills, projects }) => {
    const skillText = Array.isArray(skills) && skills.length ? skills.slice(0, 3).join(", ") : "your core skills";
    const projectText = Array.isArray(projects) && projects.length ? projects[0] : "your recent project";

    if (mode === "HR") {
        return [
            `Can you briefly introduce yourself and explain why you are interested in the ${role} role?`,
            `Tell me about a challenge you faced during ${projectText} and how you handled it effectively.`,
            `Describe a time you collaborated with teammates and what specific contribution you made to the outcome.`,
            `How do you prioritize tasks when deadlines are close and multiple responsibilities need your attention?`,
            `Why should we hire you for this role, and what impact do you plan to create in six months?`,
        ];
    }

    return [
        `Can you walk me through your experience as a ${role} and the kind of problems you usually solve?`,
        `Explain one project where you used ${skillText}, and describe your exact implementation approach.`,
        `How would you debug a production issue when users report slow performance and inconsistent behavior?`,
        `What trade-offs do you consider when designing scalable and secure APIs for real-world applications?`,
        `If you had to improve ${projectText}, what architecture changes would you propose and why?`,
    ];
};

export const analyzeResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        const fileBuffer = await fs.promises.readFile(filePath);
        const uint8Array = new Uint8Array(fileBuffer);

        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

        let resumeText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            resumeText += content.items.map(item => item.str).join(" ");
        }
        resumeText = resumeText.replace(/\s+/g, ' ').trim();

        if (!resumeText) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Could not extract text from PDF. Please upload a text-based PDF." });
        }

        const messages = [
            {
                role: "system",
                content: `
                  Extract structured data from resume.
                                    Return ONLY raw JSON.
                                    Do not wrap output in markdown or code fences.
                  
                  Return strictly JSON:
                  
                  {
                    "role": "string",
                    "experience": "string",
                    "projects": ["project1", "project2"],
                    "skills": ["skill1", "skill2"]
                  }
                      `
            },
            {
                role: "user",
                content: resumeText
            }
        ];

        let parsed;
        let analysisMode = "ai";
        try {
            const aiResponse = await askAI(messages);
            parsed = parseAiJson(aiResponse);
        } catch (aiError) {
            // Fallback keeps interview setup usable when provider/env fails.
            analysisMode = "fallback";
            parsed = extractResumeDataFallback(resumeText);
            console.error("Resume AI analysis failed, used fallback:", aiError.message);
        }

        fs.unlinkSync(filePath);

        res.json({
            role: parsed.role || "Software Engineer",
            experience: parsed.experience || "0-1 years",
            projects: Array.isArray(parsed.projects) ? parsed.projects : [],
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            resumeText,
            analysisMode,
        });



    } catch (error) {
        console.error("Error analyzing resume:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        const message = error?.message || "Failed to analyze resume";
        if (/OPENROUTER_API_KEY/i.test(message)) {
            return res.status(500).json({ error: "AI service is not configured on server. Please contact admin." });
        }
        return res.status(500).json({ error: message });
    }
};

export const generateQuestion = async (req, res) => {
    try {

        const {
            role: rawRole,
            experience: rawExperience,
            mode: rawMode,
            resumeText,
            projects,
            skills,
        } = req.body;

        const role = rawRole?.trim();
        const experience = rawExperience?.trim();
        const mode = rawMode?.trim();

        if (!role || !experience || !mode) {
            return res.status(400).json({ error: "Role, experience and mode are required" });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.credits < 50) {
            return res.status(400).json({ message: "Not enough credits. Minimum 50 credits required." });
        }

        const projectText = Array.isArray(projects) && projects.length
            ? projects.join(", ")
            : "None";

        const skillsText = Array.isArray(skills) && skills.length
            ? skills.join(", ")
            : "None";

        const safeResume = resumeText?.trim() || "None";

        const userPrompt = `
            Role:${role}
            Experience:${experience}
            InterviewMode:${mode}
            Projects:${projectText}
            skills:${skillsText},
            Resume:${safeResume}
            `;

        if (!userPrompt.trim()) {
            return res.status(400).json({
                message: "Prompt content is empty."
            });
        }

        const messages = [
            {
                role: "system",
                content: `
You are a real human interviewer conducting a professional interview.

Speak in simple, natural English as if you are directly talking to the candidate.

Generate exactly 5 interview questions.

Strict Rules:
- Each question must contain between 15 and 25 words.
- Each question must be a single complete sentence.
- Do NOT number them.
- Do NOT add explanations.
- Do NOT add text before or after.
- One question per line only.
- Keep language simple and conversational.
- Questions must feel practical and realistic.

Difficulty progression:
Question 1 → easy
Question 2 → easy
Question 3 → medium
Question 4 → medium
Question 5 → hard

Make questions based on the candidate's role, experience, interviewMode, projects, and resume details.
`
            },
            {
                role: "user",
                content: userPrompt
            }
        ];

        let questionsArray = [];
        try {
            const aiResponse = await askAI(messages);
            questionsArray = aiResponse
                .split("\n")
                .map(q => q.trim())
                .filter(q => q.length > 0)
                .slice(0, 5);
        } catch (aiError) {
            console.error("Question AI generation failed, using fallback:", aiError.message);
        }

        if (questionsArray.length === 0) {
            questionsArray = buildFallbackQuestions({ role, mode, skills, projects });
        }

        user.credits -= 50;
        await user.save();

        const interview = await Interview.create({
            userId: user._id,
            role,
            experience,
            mode,
            resumeText: safeResume,
            questions: questionsArray.map((q, index) => ({
                question: q,
                difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
                timeLimit: [60, 60, 90, 90, 120][index],
            }))
        });

        res.json({
            interviewId: interview._id,
            questions: interview.questions,
            creditsLeft: user.credits,
            userName: user.name
        });

    } catch (error) {
        console.error("Error generating question:", error);
        return res.status(500).json({ error: `Failed to generate question ${error.message}` });
    }
};


export const submitAnswer = async (req, res) => {
    try {
        const { interviewId, questionIndex, answer, timeTaken } = req.body;
        if (!interviewId || questionIndex === undefined || !answer || timeTaken === undefined) {
            return res.status(400).json({ error: "interviewId, questionIndex, answer and timeTaken are required" });
        }

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const question = interview?.questions[questionIndex];
        if (!question) {
            return res.status(400).json({ error: "Invalid question index" });
        }

        // If time exceeded
        if (timeTaken > question.timeLimit) {
            question.score = 0;
            question.feedback = "Time limit exceeded. Answer not evaluated.";
            question.answer = answer;

            await interview.save();

            return res.json({
                feedback: question.feedback
            });
        }

        const messages = [
            {
                role: "system",
                content: `
You are a professional human interviewer evaluating a candidate's answer in a real interview.

Evaluate naturally and fairly, like a real person would.

Score the answer in these areas (0 to 10):

1. Confidence – Does the answer sound clear, confident, and well-presented?
2. Communication – Is the language simple, clear, and easy to understand?
3. Correctness – Is the answer accurate, relevant, and complete?

Rules:
- Be realistic and unbiased.
- Do not give random high scores.
- If the answer is weak, score low.
- If the answer is strong and  detailed, score high.
- Consider clarity, structure, and relevance. 
Calculate:
finalScore = average of confidence, communication, and correctness (rounded to nearest whole number).

Feedback Rules:
- Write natural human feedback.
- 10 to 15 words only.
- Sound like real interview feedback.
- Can suggest improvement if needed.
- Do NOT repeat the question.
- Do NOT explain scoring.
- Keep tone professional and honest.

Return ONLY valid JSON in this format:

{
  "confidence": number,
  "communication": number,
  "correctness": number,
    "finalScore": number,
    "feedback": short human feedback
}
`
            },
            {
                role: "user",
                content: `Question: ${question.question}
Candidate's Answer: ${answer}
`
            }
        ];

        let parsed;
        try {
            const aiResponse = await askAI(messages);
            parsed = parseAnswerEvaluation(aiResponse, answer, question.question);
        } catch (aiError) {
            // Keep interview flow resilient in production even when provider credentials/rate limits fail.
            console.error("Answer evaluation AI failed, using fallback scoring:", aiError.message);
            parsed = buildFallbackEvaluation(answer, "", question.question);
        }

        question.answer = answer;
        question.confidence = parsed.confidence;
        question.communication = parsed.communication;
        question.correctness = parsed.correctness;
        question.score = parsed.finalScore;
        question.feedback = parsed.feedback;
        await interview.save();

        return res.json({
            feedback: parsed.feedback
        });

    } catch (error) {
        console.error("Error submitting answer:", error);
        return res.status(500).json({ error: `Failed to submit answer ${error.message}` });
    }
};

export const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;
        if (!interviewId) {
            return res.status(400).json({ error: "interviewId is required" });
        }
        const interview = await Interview.findById(interviewId
        );
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const totalQuestions = interview.questions.length;
        let totalScore = 0;
        let totalConfidence = 0;
        let totalCommunication = 0;
        let totalCorrectness = 0;

        interview.questions.forEach((q) => {
            totalScore += q.score || 0;
            totalConfidence += q.confidence || 0;
            totalCommunication += q.communication || 0;
            totalCorrectness += q.correctness || 0;
        });

        const finalScore = totalQuestions
            ? totalScore / totalQuestions
            : 0;

        const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
        const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
        const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

        interview.finalScore = Math.round(finalScore);
        interview.status = "completed";
        await interview.save();

        const user = await User.findById(req.userId);
        if (user) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const last = user.lastInterviewDate ? new Date(user.lastInterviewDate) : null;
            const lastDay = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate()) : null;

            if (!lastDay || today.getTime() !== lastDay.getTime()) {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                user.currentStreak = lastDay && lastDay.getTime() === yesterday.getTime()
                    ? (user.currentStreak || 0) + 1
                    : 1;

                user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
                user.lastInterviewDate = now;
                await user.save();
            }
        }

        return res.status(200).json({
            finalScore: Number(finalScore.toFixed(1)),
            confidence: Number(avgConfidence.toFixed(1)),
            communication: Number(avgCommunication.toFixed(1)),
            correctness: Number(avgCorrectness.toFixed(1)),
            questionWiseScore: interview.questions.map((q) => ({
                question: q.question,
                score: q.score || 0,
                feedback: q.feedback || "",
                confidence: q.confidence || 0,
                communication: q.communication || 0,
                correctness: q.correctness || 0,
            })),
        });

    } catch (error) {
        console.error("Error finishing interview:", error);
        return res.status(500).json({ error: `Failed to finish interview ${error.message}` });
    }
};


export const getMyInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.userId }).sort({ createdAt: -1 }).select("role experience mode finalScore status createdAt");

        if (!interviews.length) {
            return res.status(404).json({ error: "No interviews found for this user" });
        }
        return res.status(200).json({ interviews });

    } catch (error) {
        console.error("Error fetching interviews:", error);
        return res.status(500).json({ error: `Failed to fetch interviews ${error.message}` });
    }
};

export const getInterviewReport = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        if (interview.userId.toString() !== req.userId) {
            return res.status(403).json({ error: "Unauthorized access to this interview report" });
        }

        return res.json(buildInterviewReportPayload(interview));
        
    } catch (error) {
        console.error("Error fetching interview report:", error);
        return res.status(500).json({ error: `Failed to fetch interview report ${error.message}` });
    }
};

export const getInterviewAnalytics = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        if (interview.userId.toString() !== req.userId) {
            return res.status(403).json({ error: "Unauthorized access to interview analytics" });
        }

        return res.json(
            await buildInterviewAnalyticsPayload(interview, {
                scope: req.query.scope,
                limit: req.query.limit,
            }),
        );
    } catch (error) {
        console.error("Error fetching interview analytics:", error);
        return res.status(500).json({ error: `Failed to fetch interview analytics ${error.message}` });
    }
};

export const createInterviewShareLink = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id).select("_id userId");

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        if (interview.userId.toString() !== req.userId) {
            return res.status(403).json({ error: "Unauthorized to share this report" });
        }

        const token = jwt.sign(
            {
                type: "interview-share",
                interviewId: interview._id.toString(),
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" },
        );

        return res.json({ token });
    } catch (error) {
        console.error("Error creating interview share link:", error);
        return res.status(500).json({ error: `Failed to create share link ${error.message}` });
    }
};

export const getPublicInterviewReport = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || decoded.type !== "interview-share" || !decoded.interviewId) {
            return res.status(400).json({ error: "Invalid or expired share link" });
        }

        const interview = await Interview.findById(decoded.interviewId);
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const report = buildInterviewReportPayload(interview);
        const analytics = await buildInterviewAnalyticsPayload(interview, { scope: "role" });

        return res.json({ report, analytics, shared: true });
    } catch (error) {
        console.error("Error fetching public interview report:", error);
        return res.status(400).json({ error: "Invalid or expired share link" });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const mode = req.query.mode || "score"; // score | streak
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        if (mode === "streak") {
            // Top users by current streak
            const users = await User.find({ currentStreak: { $gt: 0 } })
                .sort({ currentStreak: -1, longestStreak: -1 })
                .limit(limit)
                .select("name currentStreak longestStreak subscriptionPlan");

            return res.json(
                users.map((u, i) => ({
                    rank: i + 1,
                    name: u.name,
                    currentStreak: u.currentStreak,
                    longestStreak: u.longestStreak,
                    subscriptionPlan: u.subscriptionPlan,
                }))
            );
        }

        // Top users by best interview final score (across all completed interviews)
        const top = await Interview.aggregate([
            { $match: { status: "completed" } },
            {
                $group: {
                    _id: "$userId",
                    bestScore: { $max: "$finalScore" },
                    avgScore: { $avg: "$finalScore" },
                    totalInterviews: { $sum: 1 },
                },
            },
            { $sort: { bestScore: -1, avgScore: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $project: {
                    name: "$user.name",
                    subscriptionPlan: "$user.subscriptionPlan",
                    currentStreak: "$user.currentStreak",
                    bestScore: 1,
                    avgScore: { $round: ["$avgScore", 1] },
                    totalInterviews: 1,
                },
            },
        ]);

        return res.json(
            top.map((u, i) => ({
                rank: i + 1,
                name: u.name,
                bestScore: u.bestScore,
                avgScore: u.avgScore,
                totalInterviews: u.totalInterviews,
                currentStreak: u.currentStreak,
                subscriptionPlan: u.subscriptionPlan,
            }))
        );
    } catch (error) {
        console.error("Error in getLeaderboard:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};






