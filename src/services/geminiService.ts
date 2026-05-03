import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ProcessedStudyMaterial {
  title: string;
  summary: string;
  notes: string;
  flashcards: { front: string; back: string }[];
  quiz: { question: string; options: string[]; correctAnswer: string }[];
  mindMap: string;
}

function extractJson(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json?\s*([\s\S]*?)\s*```/g, '$1').trim();
  // Remove potential double escaped newlines or weird sequences that AI might produce
  cleaned = cleaned.replace(/\\n{3,}/g, '\\n\\n'); 
  return cleaned;
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Replace sequences of more than 2 newlines with exactly 2
    return obj.replace(/\n{3,}/g, '\n\n').trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = sanitizeObject(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export async function processFile(file: File): Promise<ProcessedStudyMaterial> {
  const fileData = await fileToBase64(file);
  
  const prompt = `
    Analyze this material and generate a structured study kit.
    Focus on key definitions, concepts, and relationships.
    
    Return a VALID JSON object (with escaped newlines) containing:
    - title: Subject/Topic title
    - summary: 2-3 sentence overview
    - notes: Structured markdown notes
    - flashcards: 5 Q&A pairs
    - quiz: 5 multiple-choice questions
    - mindMap: A hierarchy string (Topic > Subtopic)

    JSON SCHEMA:
    {
      "title": "string",
      "summary": "string",
      "notes": "string",
      "flashcards": [{"front": "string", "back": "string"}],
      "quiz": [{"question": "string", "options": ["string"], "correctAnswer": "string"}],
      "mindMap": "string"
    }
  `;

  const modelToUse = "gemini-2.0-flash";

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: fileData,
                mimeType: file.type
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a professional study assistant. Output only valid JSON. Do not include extra text or commentary.",
        responseMimeType: "application/json",
        responseSchema: {
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
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer"]
              }
            },
            mindMap: { type: Type.STRING }
          },
          required: ["title", "summary", "notes", "flashcards", "quiz", "mindMap"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("The AI failed to generate a response. Please try again.");
    }

    const text = response.text;
    
    try {
      const cleanedJson = extractJson(text);
      const parsed = JSON.parse(cleanedJson);
      return sanitizeObject(parsed) as ProcessedStudyMaterial;
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("AI returned a malformed response. Trying again might help.");
    }
  } catch (err: any) {
    console.error("AI Error:", err);
    if (err.message?.includes('404')) {
      throw new Error("API configuration error: Model not found.");
    }
    throw err;
  }
}

export async function processYoutubeUrl(url: string): Promise<ProcessedStudyMaterial> {
  const prompt = `
    Analyze this YouTube video: ${url}
    Generate a structured study kit based on the video content.
    If you cannot access the video directly, create a sample study kit BASED ON THE TITLE/TOPIC IMPLIED by the URL if possible, or explain that you need more context.
    
    Return a VALID JSON object containing:
    - title: Subject/Topic title
    - summary: 2-3 sentence overview
    - notes: Structured markdown notes
    - flashcards: 5 Q&A pairs
    - quiz: 5 multiple-choice questions
    - mindMap: A hierarchy string (Topic > Subtopic)

    JSON SCHEMA:
    {
      "title": "string",
      "summary": "string",
      "notes": "string",
      "flashcards": [{"front": "string", "back": "string"}],
      "quiz": [{"question": "string", "options": ["string"], "correctAnswer": "string"}],
      "mindMap": "string"
    }
  `;

  const modelToUse = "gemini-2.0-flash";

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        systemInstruction: "You are a professional study assistant. Output only valid JSON. Do not include extra text or commentary.",
        responseMimeType: "application/json",
        responseSchema: {
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
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer"]
              }
            },
            mindMap: { type: Type.STRING }
          },
          required: ["title", "summary", "notes", "flashcards", "quiz", "mindMap"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("The AI failed to generate a response. Please try again.");
    }

    const text = response.text;
    const cleanedJson = extractJson(text);
    const parsed = JSON.parse(cleanedJson);
    return sanitizeObject(parsed) as ProcessedStudyMaterial;
  } catch (err: any) {
    console.error("AI Youtube Error:", err);
    throw err;
  }
}

export async function chatAboutMaterial(material: ProcessedStudyMaterial, query: string, history: { role: 'user' | 'model', content: string }[]) {
  const systemInstruction = `You are MoonBuddy AI. Context:
  Title: ${material.title}
  Summary: ${material.summary}
  Notes: ${material.notes}
  
  Answer strictly based on the provided material.`;

  const modelToUse = "gemini-2.0-flash";

  const chat = ai.chats.create({
    model: modelToUse,
    config: {
      systemInstruction
    },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
  });

  const result = await chat.sendMessage({ message: query });
  return result.text;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const parts = reader.result?.toString().split(',');
      if (parts && parts.length > 1) {
        resolve(parts[1]);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
