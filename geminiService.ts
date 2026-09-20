import mammoth from "mammoth";
import JSZip from "jszip";
import * as pdfjs from 'pdfjs-dist';

// Configure worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface ProcessedStudyMaterial {
  title: string;
  summary: string;
  notes: string;
  flashcards: { front: string; back: string }[];
  quiz: { question: string; options: string[]; correctAnswer: string }[];
  mindMap: string;
}

function extractJson(text: string): string {
  let cleaned = text.replace(/```json?\s*([\s\S]*?)\s*```/g, "$1").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
}

function getMimeType(file: File): string {
  if (file.type && file.type !== "") return file.type;
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (fileName.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (fileName.endsWith('.doc')) return 'application/vnd.ms-word';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.txt')) return 'text/plain';
  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.webm')) return 'video/webm';
  if (fileName.endsWith('.mov')) return 'video/quicktime';
  if (fileName.endsWith('.mpeg') || fileName.endsWith('.mpg')) return 'video/mpeg';
  if (fileName.endsWith('.avi')) return 'video/x-msvideo';
  if (fileName.endsWith('.mkv')) return 'video/x-matroska';
  if (fileName.endsWith('.mp3')) return 'audio/mpeg';
  if (fileName.endsWith('.wav')) return 'audio/wav';
  if (fileName.endsWith('.ogg')) return 'audio/ogg';
  if (fileName.endsWith('.m4a')) return 'audio/mp4';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + "\n\n";
  }
  return fullText;
}

async function extractTextFromPptx(file: File): Promise<string> {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  const slides = Object.keys(content.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  slides.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.at(0) || '0');
    const numB = parseInt(b.match(/\d+/)?.at(0) || '0');
    return numA - numB;
  });
  let fullText = "";
  for (const slidePath of slides) {
    const slideXml = await content.file(slidePath)?.async("text");
    if (slideXml) {
      const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (textMatches) {
        const slideText = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
        fullText += `[Slide ${slides.indexOf(slidePath) + 1}]: ${slideText}\n\n`;
      }
    }
  }
  return fullText;
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function processFile(file: File): Promise<ProcessedStudyMaterial> {
  const mimeType = getMimeType(file);
  const isDoc = mimeType.includes('pdf') || mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('text');
  
  const MAX_SIZE_MB = 20;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Cosmic Limit: Files must be under ${MAX_SIZE_MB}MB.`);
  }

  let prompt = "";
  let fileData = "";

  if (isDoc) {
    let extractedText = "";
    if (mimeType.includes('pdf')) {
      extractedText = await extractTextFromPdf(file);
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      extractedText = await extractTextFromPptx(file);
    } else if (mimeType.includes('word') || mimeType.includes('officedocument.word')) {
      extractedText = await extractTextFromDocx(file);
    } else {
      extractedText = await file.text();
    }
    
    // Truncate if extremely large to avoid prompt limits, but usually extracted text is fine
    if (extractedText.length > 60000) {
       extractedText = extractedText.substring(0, 60000) + "... [Content truncated due to size]";
    }
    
    prompt = `Analyze this document and create a study kit. Content:\n\n${extractedText}`;
  } else {
    fileData = await fileToBase64(file);
    prompt = "Analyze this multimedia content and create a study kit.";
  }

  prompt += `
    Return a VALID JSON object containing:
    - title: Subject/Topic title
    - summary: 2-3 sentence overview
    - notes: Structured markdown notes
    - flashcards: 5 Q&A pairs (front, back)
    - quiz: 5 multiple-choice questions (question, options, correctAnswer)
    - mindMap: A hierarchy string (Topic > Subtopic)
  `;

  async function fetchWithRetry(url: string, options: any, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        if (i === retries) throw err;
        console.warn(`Fetch attempt ${i + 1} failed, retrying...`, err);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw new Error("Fetch failed after retries");
  }

  const res = await fetchWithRetry("/api/process/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileData, mimeType, prompt })
  });

  if (!res.ok) {
    let errText = "Failed to process cosmic frequencies.";
    try {
      const errData = await res.json();
      errText = errData.error || errText;
    } catch {
      // Fallback for non-JSON errors
    }
    throw new Error(errText);
  }

  const { result } = await res.json();
  const cleaned = extractJson(result);
  return JSON.parse(cleaned);
}

export async function processYoutubeUrl(url: string): Promise<ProcessedStudyMaterial> {
  const prompt = `
    Analyze this YouTube video: ${url}
    Return a VALID JSON object containing:
    - title, summary, notes, flashcards, quiz, mindMap.
  `;

  async function fetchWithRetry(url: string, options: any, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        if (i === retries) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw new Error("Fetch failed after retries");
  }

  const res = await fetchWithRetry("/api/process/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, prompt })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to sync with YouTube satellite.");
  }

  const { result } = await res.json();
  const cleaned = extractJson(result);
  return JSON.parse(cleaned);
}

export async function chatAboutMaterial(material: ProcessedStudyMaterial, query: string, history: { role: 'user' | 'model', content: string }[]) {
  async function fetchWithRetry(url: string, options: any, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        if (i === retries) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw new Error("Fetch failed after retries");
  }

  const res = await fetchWithRetry("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ material, query, history })
  });

  if (!res.ok) throw new Error("Chat connection lost.");
  const { text } = await res.json();
  return text;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
    reader.onerror = reject;
  });
}
