const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const pdf = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;
const NOTES_LIMIT = 15000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({
    dest: "uploads/"
});

let studyNotes = "";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", upload.single("notes"), async function (req, res) {
    try {
        const uploadedFile = req.file;

        if (!uploadedFile) {
            return res.json({
                success: false,
                message: "Please select a file."
            });
        }

        if (uploadedFile.mimetype === "application/pdf") {
            const fileBuffer = fs.readFileSync(uploadedFile.path);
            const pdfData = await pdf(fileBuffer);
            studyNotes = pdfData.text;
        } else {
            studyNotes = fs.readFileSync(uploadedFile.path, "utf8");
        }

        fs.unlink(uploadedFile.path, function () { });

        if (!studyNotes.trim()) {
            return res.json({
                success: false,
                message: "No readable text was found in this file."
            });
        }

        res.json({
            success: true,
            message: "Notes uploaded successfully!",
            fileName: uploadedFile.originalname
        });

    } catch (error) {
        res.json({
            success: false,
            message: "Unable to read this file."
        });
    }
});

app.post("/ask", async function (req, res) {
    const question = (req.body.question || "").trim();

    if (!studyNotes) {
        return res.json({
            success: false,
            message: "Please upload study notes first."
        });
    }

    if (!question) {
        return res.json({
            success: false,
            message: "Please enter a question."
        });
    }

    try {
        const answer = await askOpenAI(
            "You are StudyMate AI, a helpful tutor. Answer the student's question using only the uploaded notes. If the notes do not contain the answer, say so clearly.",
            "Study notes:\n" + studyNotes.slice(0, NOTES_LIMIT) + "\n\nQuestion:\n" + question
        );

        res.json({
            success: true,
            answer: answer
        });
    } catch (error) {
        res.json({
            success: false,
            message: openaiErrorMessage(error)
        });
    }
});

app.post("/revise", async function (req, res) {
    if (!studyNotes) {
        return res.json({
            success: false,
            message: "Please upload study notes first."
        });
    }

    try {
        const answer = await askOpenAI(
            "You are StudyMate AI. Create clear revision material from the student's notes.",
            "Turn these notes into revision material with:\n1. A short summary\n2. Key points as a bullet list\n3. Five quiz questions with answers\n\nNotes:\n" + studyNotes.slice(0, NOTES_LIMIT)
        );

        res.json({
            success: true,
            answer: answer
        });
    } catch (error) {
        res.json({
            success: false,
            message: openaiErrorMessage(error)
        });
    }
});

async function askOpenAI(systemPrompt, userPrompt) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("MISSING_API_KEY");
    }

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    });

    return completion.choices[0].message.content;
}

function openaiErrorMessage(error) {
    console.error(error);

    if (error.message === "MISSING_API_KEY") {
        return "Add your OpenAI API key to a .env file as OPENAI_API_KEY, then restart the server.";
    }

    const text = String(error.message || "").toLowerCase();

    if (text.includes("incorrect api key") || text.includes("invalid_api_key") || text.includes("401")) {
        return "The API key is invalid. Put a new key in .env and restart the server.";
    }

    if (text.includes("insufficient_quota") || text.includes("billing")) {
        return "OpenAI billing/credits are missing. Add payment at platform.openai.com, then try again.";
    }

    return "The AI could not answer right now. Look at the terminal error and try again.";
}

app.listen(PORT, function () {
    console.log("StudyMate AI is running at http://localhost:" + PORT);
});