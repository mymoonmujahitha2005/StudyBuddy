import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Consolidated path helper
const getDirInfo = () => {
  let dir = "";
  try {
    dir = path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    dir = __dirname;
  }
  return dir;
};

const resolvedDirname = getDirInfo();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const MODEL_NAME = "gemini-3-flash-preview";

  // Use the Type enum for the schema
  const STUDY_KIT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      notes: { type: Type.STRING },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
          },
          required: ["front", "back"],
        },
      },
      quiz: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
          },
          required: ["question", "options", "correctAnswer"],
        },
      },
      mindMap: { type: Type.STRING },
    },
    required: ["title", "summary", "notes", "flashcards", "quiz", "mindMap"],
  };

  // Helper for retrying AI calls on transient errors
  async function withRetry(fn: () => Promise<any>, retries = 4, delay = 3000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        // Detailed error logging
        console.error(`[AI Attempt ${i + 1}] Error:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error.details
        });

        const isTransient = 
          error.status === 'UNAVAILABLE' || 
          error.code === 503 || 
          (error.message && (
            error.message.includes("503") || 
            error.message.includes("UNAVAILABLE") || 
            error.message.includes("429") ||
            error.message.includes("deadline exceeded")
          ));

        if (isTransient && i < retries - 1) {
          console.log(`[AI] Transient error detected. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Slightly slower backoff
          continue;
        }
        throw error;
      }
    }
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasKey: !!process.env.GEMINI_API_KEY,
      resolvedDirname,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/process/file", async (req, res) => {
    const { fileName, fileData, mimeType, prompt } = req.body;
    console.log(`[AI] Started processing file: ${fileName || 'unknown'} (${mimeType}, payload: ${Math.round(JSON.stringify(req.body).length / 1024)} KB)`);
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in the host environment." });
      }

      let contentParts: any[] = [];
      if (fileData && fileData.trim() !== "") {
        console.log(`[AI] Attaching file data (${mimeType})`);
        contentParts.push({ inlineData: { data: fileData, mimeType: mimeType } });
      }
      contentParts.unshift({ text: prompt });

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: { parts: contentParts },
          config: {
            systemInstruction: "You are a professional study assistant. Analyze the provided content and forge a comprehensive study kit. Ensure all response values are strictly populated and formatted clearly.",
            responseMimeType: "application/json",
            responseSchema: STUDY_KIT_SCHEMA as any
          }
        });
        return response.text;
      });
      
      console.log(`[AI] Successfully processed: ${fileName}`);
      res.json({ result });
    } catch (error: any) {
      console.error("[Severe] Server AI Error:", error);
      res.status(500).json({ 
        error: error.message,
        details: error.stack
      });
    }
  });

  app.post("/api/process/youtube", async (req, res) => {
    console.log(`[AI] Processing Youtube: ${req.body.url}`);
    try {
      const { url, prompt } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction: "You are a professional study assistant. Analyze the YouTube content and create a structured study kit.",
            responseMimeType: "application/json",
            responseSchema: STUDY_KIT_SCHEMA as any
          }
        });
        return response.text;
      });
      res.json({ result });
    } catch (error: any) {
      console.error("[Severe] Youtube AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { material, query, history } = req.body;
      const notesContext = typeof material.notes === 'string' ? material.notes : JSON.stringify(material.notes);
      
      const systemInstruction = `You are MoonBuddy AI. Context:
      Title: ${material.title}
      Summary: ${material.summary}
      Notes: ${notesContext}
      
      Answer strictly based on the provided material. Be helpful, concise, and encourage the student.`;
      
      const text = await withRetry(async () => {
        const chat = ai.chats.create({
          model: MODEL_NAME,
          config: { systemInstruction },
          history: (history || []).map((h: any) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }))
        });
        const result = await chat.sendMessage({ message: query });
        return result.text;
      });
      res.json({ text });
    } catch (error: any) {
      console.error("[Severe] Server Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[Dev] Starting Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`[Production] Serving from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(500).send("MoonBuddy Error: Assets not found. Please try again later.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
