import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Initialize Gemini (User must provide GEMINI_API_KEY in .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateAdCopy(context: any, prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  // Using gemini-2.5-pro for better knowledge/reasoning
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const systemPrompt = `
    You are an expert marketing copywriter for a Car Rental service in Malaysia (JRV Services).
    
    Context Data:
    ${JSON.stringify(context, null, 2)}
    
    Task:
    ${prompt}
    ${context.custom_keywords ? `\nMake sure to explicitly include and emphasize the following keywords: ${context.custom_keywords.join(", ")}` : ""}
    
    Output JSON format:
    {
      "headline": "...",
      "body": "...",
      "keywords": ["..."],
      "hashtags": ["..."]
    }
  `;

  const result = await model.generateContent(systemPrompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Attempt to extract JSON if wrapped in markdown blocks
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return { error: "Failed to parse JSON", raw: text };
  }
}

export async function generateImagePrompt(context: any, userPrompt: string) {
    // Use Gemini to refine the image prompt based on car details
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    const prompt = `
      Refine this image generation prompt for a car rental ad.
      Context: ${JSON.stringify(context)}
      User Input: ${userPrompt}
      
      CRITICAL INSTRUCTION:
      The output prompt must create a PHOTOREALISTIC, CINEMATIC image.
      You MUST explicitly describe the specific visual design cues of the 2025-2026 Facelift model to ensure the image generator draws the correct version.
      - Describe the shape of the headlights (e.g., "sharp slim LEDs").
      - Describe the grille (e.g., "large diamond pattern grille" or "frameless grille").
      - Describe the body shape if it has changed (e.g., "fastback silhouette").
      - INDEED, use the term "Latest 2026 Facelift", but ALSO describe it.
      It must NOT include any text, letters, words, logos, or UI elements inside the image itself.
      Focus on the visual scene, lighting, composition, and the car.
      Example good output: "A shiny white Perodua Axia driving along a scenic Malaysian coastal road during golden hour, ultra-realistic, 8k resolution, cinematic lighting."
      
      Output ONLY the refined prompt text.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Generates ACTUAL images using Gemini Imagen 4.0
 * Returns an array of Cloudinary URLs
 */
export async function generateRealImage(prompt: string, count: number = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  // Use gemini-3-pro-image-preview with Grounding
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

  try {
    const promises = Array.from({ length: count }).map(async () => {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }], // Enable Grounding
            generationConfig: {
                responseModalities: ["IMAGE"], // camelCase as per docs
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "2K"
                }
            }
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.error) throw new Error(`Gemini Image Error: ${result.error.message}`);
        
        // Response uses "inlineData" (camelCase)
        const part = result.candidates?.[0]?.content?.parts?.[0];
        const inlineData = part?.inlineData || part?.inline_data;

        if (!inlineData) {
             console.error("Missing inlineData. Parts:", result.candidates?.[0]?.content?.parts);
             throw new Error("No image data.");
        }
        
        return inlineData;
    });

    const results = await Promise.all(promises);

    // Upload all to Cloudinary
    const uploadPromises = results.map(async (inlineData: any) => {
        const base64Image = inlineData.data;
        const mimeType = inlineData.mime_type || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        const uploadResult = await cloudinary.uploader.upload(dataUrl, {
            folder: "jrv/marketing",
            resource_type: "image",
        });
        return uploadResult.secure_url;
    });

    return await Promise.all(uploadPromises);

  } catch (e: any) {
    console.error("Gemini Image Generation Error:", e);
    throw new Error(e.message || "Failed to generate image.");
  }
}
