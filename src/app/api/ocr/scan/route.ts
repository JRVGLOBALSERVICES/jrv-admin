import { NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// ✅ Helper: Clean Key (Removes extra quotes and fixes newlines)
const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || "";
  
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }
  
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.substring(1, key.length - 1);
  }

  return key.replace(/\\n/g, "\n");
};

const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: getPrivateKey(),
  },
});

// ⛔ Words to ignore when searching for a Name
const BLACKLIST_WORDS = [
  "MALAYSIA", "KAD", "PENGENALAN", "IDENTITY", "CARD", "MYKAD", 
  "GOVERNMENT", "KERAJAAN", "WARGANEGARA", "LELAKI", "PEREMPUAN", 
  "ISLAM", "KRISTIAN", "BUDDHA", "HINDU", "JANTINA", "AGAMA", "ALAMAT",
  "W/N", "ASAL", "TARIKH", "TEMPAT", "LAHIR"
];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Send to Google Cloud Vision
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return NextResponse.json({ error: "No text detected" }, { status: 422 });
    }

    // 2. Process Lines
    const fullText = detections[0].description || "";
    const lines = fullText.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 2); // Ignore very short noise

    let idNumber = "";
    let name = "";

    // 3. Extract IC Number (Regex: 6-2-4 digits)
    const icRegex = /(\d{6})[-]?(\d{2})[-]?(\d{4})/;

    for (const line of lines) {
      const match = line.match(icRegex);
      if (match) {
        idNumber = `${match[1]}-${match[2]}-${match[3]}`;
        break; // Stop after finding the first valid IC
      }
    }

    // 4. Extract Name (Heuristic: Top-down scan)
    // The Name is usually the FIRST uppercase line that is NOT a header/blacklist word
    for (const line of lines) {
      const upper = line.toUpperCase();
      
      // Skip lines that contain blacklisted words
      const isBlacklisted = BLACKLIST_WORDS.some(w => upper.includes(w));
      if (isBlacklisted) continue;

      // Skip lines that look like the IC number we just found
      if (idNumber && line.replace(/-/g, "").includes(idNumber.replace(/-/g, "").substring(0,6))) continue;

      // Skip lines with digits (Names usually don't have numbers)
      if (/\d/.test(line)) continue;

      // Skip very short words (noise)
      if (line.length < 4) continue;

      // If we passed all checks, this is likely the Name
      name = line;
      break; 
    }

    return NextResponse.json({ 
      ok: true, 
      data: { 
        name: name.replace(/[^a-zA-Z\s@\.]/g, "").trim(), // Clean up symbols
        id_number: idNumber 
      } 
    });

  } catch (e: any) {
    console.error("OCR Error:", e);
    return NextResponse.json({ error: e.message || "OCR Failed" }, { status: 500 });
  }
}