"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary for server actions
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function generateContentWithAI(title: string, slug: string, lang: "bm" | "en") {
  const gate = await requireAdmin();
  if (!gate.ok || gate.role !== "superadmin") {
    throw new Error("Only superadmins can use AI generation.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }

  const prompt = `
    You are an expert SEO content writer for a car rental service in Malaysia (JRV Services).
    Generate landing page content for a page titled "${title}" with slug "${slug}".
    
    CRITICAL: The content MUST be written in the following language: ${lang === "en" ? "ENGLISH" : "BAHASA MELAYU"}.
    ${lang === "en" ? "DO NOT use any Bahasa Melayu word. Every single word must be in English." : "Ensure natural, native Bahasa Melayu flow."}
    
    Return ONLY a JSON object with these keys:
    - slug: A URL-friendly slug (lowercase, hyphens only, e.g. "kereta-sewa-klia")
    - title: SEO title (max 60 chars)
    - meta_description: SEO meta description (max 160 chars)
    - h1_title: Main H1 heading
    - intro_text: Short intro sentence
    - cta_text: Bold Call to Action button text
    - cta_link: URL link (e.g. "/contact" or "#booking")
    - body_content: An array of 5-8 detailed content blocks. 
      Each block must be one of:
      - { type: "h2" | "h3", content: "Heading text" }
      - { type: "text", content: "Paragraph text with <b>bold</b> tags" }
      - { type: "list", items: ["Point 1", "Point 2", ...] }
      - { type: "features", items: [{ title: "Feature Title", description: "Short description" }, ...] }
      - { type: "image", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70", alt_text: "Descriptive alt" }
    - image_prompts: An array of 3 descriptive image generation prompts (in English). 
      Prompts should follow this style: "High-quality realistic commercial automotive photography, [Car Make/Model, e.g. Silver Proton Saga] parked in [Specific Location context], professional 8k resolution, daytime lighting, clean reflections, JRV Services brand aesthetic". 
      AVOID abstract art; focus on realistic car-centric scenes.
    
    Content requirements:
    - Language: ${lang === "en" ? "Strictly Professional English Only" : "Natural, native Bahasa Melayu Only"}.
    - Context: Car rental in Malaysia.
    - Style: High-converting, professional, and trustworthy.
  `;

  const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest"];
  let lastError = "";

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
              temperature: 0.4,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
              response_mime_type: "application/json"
          }
        }),
      });

      const result = await response.json();
      
      if (result.error) {
          lastError = result.error.message;
          if (result.error.message.includes("not found")) continue;
          throw new Error(result.error.message);
      }

      let content = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
          const finishReason = result.candidates?.[0]?.finishReason;
          if (finishReason === "SAFETY") throw new Error("Blocked by safety filters.");
          continue;
      }
      
      content = content.replace(/^```json\s*|```$/g, "").trim();
      return JSON.parse(content);
    } catch (e: any) {
      lastError = e.message;
      if (e.message.includes("safety") || e.message.includes("quota")) break;
    }
  }

  throw new Error(`AI Content Generation failed: ${lastError}`);
}

/**
 * Generates an image using Gemini Imagen 3 and uploads it to Cloudinary.
 * Returns the secure Cloudinary URL.
 */
export async function generateImageWithGemini(prompt: string) {
  const gate = await requireAdmin();
  if (!gate.ok || gate.role !== "superadmin") {
    throw new Error("Only superadmins can generate images.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary is not configured.");
  }

  // Use Imagen 4.0 which we verified is available for this key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          // Note: Imagen 4 might have different parameter keys, sticking to basics that work
        },
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`Gemini Image Error: ${result.error.message}`);
    }

    const prediction = result.predictions?.[0];
    const base64Image = prediction?.bytesBase64Encoded;
    const mimeType = prediction?.mimeType || "image/png";

    if (!base64Image) {
      throw new Error("Gemini did not return any image data. Please try a different prompt or check your safety settings.");
    }

    // Upload to Cloudinary
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    const uniqueId = `imagen4_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const uploadResult = await cloudinary.uploader.upload(dataUrl, {
      folder: "jrv/landing-pages",
      public_id: uniqueId,
      overwrite: false,
      resource_type: "image",
    });

    return uploadResult.secure_url;
  } catch (e: any) {
    console.error("Gemini Image Generation Error:", e);
    throw new Error(e.message || "Failed to generate image with Gemini.");
  }
}
