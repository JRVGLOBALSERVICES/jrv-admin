import { NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// ✅ Helper: Clean Key
const getPrivateKey = () => {
  let key = process.env.GOOGLE_PRIVATE_KEY || "";
  if (key.startsWith('"') && key.endsWith('"'))
    key = key.substring(1, key.length - 1);
  if (key.startsWith("'") && key.endsWith("'"))
    key = key.substring(1, key.length - 1);
  return key.replace(/\\n/g, "\n");
};

const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: getPrivateKey(),
  },
});

// ⛔ Words to ignore
const BLACKLIST_WORDS = [
  "MALAYSIA",
  "KAD",
  "PENGENALAN",
  "IDENTITY",
  "CARD",
  "MYKAD",
  "IDEN",
  "GOVERNMENT",
  "KERAJAAN",
  "WARGANEGARA",
  "LELAKI",
  "PEREMPUAN",
  "ISLAM",
  "KRISTIAN",
  "BUDDHA",
  "HINDU",
  "JANTINA",
  "AGAMA",
  "ALAMAT",
  "W/N",
  "ASAL",
  "TARIKH",
  "TEMPAT",
  "LAHIR",
  "SIAKI",
  "ORIGINAL",
  "GANTI",
  "ANMAL",
  "RAJAA",
  "ANMALA",
  "KERAJA",
  "CONTOH",
  "PASSPORT",
  "OMAN",
  "SULTANATE",
];

function isNameLine(line: string) {
  const upper = line.toUpperCase();
  if (BLACKLIST_WORDS.some((w) => upper.includes(w))) return false;
  if (/\d/.test(line)) return false;
  if (line.length < 3) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Send to Google Cloud Vision
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return NextResponse.json({ error: "No text detected" }, { status: 422 });
    }

    const fullText = detections[0].description || "";
    const lines = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let idNumber = "";
    let fullName = "";

    // --- STRATEGY 1: CHECK FOR PASSPORT (MRZ Code) ---
    // MRZ Line 1 starts with P, I, or A followed by <
    // MRZ Line 2 usually contains the Passport Number at the start

    let mrzLine1 = "";
    let mrzLine2 = "";

    for (const line of lines) {
      const clean = line.replace(/\s/g, ""); // Remove spaces

      // Detect Line 1 (P<OMN...)
      if (
        (clean.startsWith("P<") ||
          clean.startsWith("I<") ||
          clean.startsWith("A<")) &&
        clean.includes("<<")
      ) {
        mrzLine1 = clean;
      }

      // Detect Line 2 (Alphanumeric start + Digits + Long length)
      // Usually immediately follows Line 1
      if (
        mrzLine1 &&
        clean !== mrzLine1 &&
        clean.length > 20 &&
        /\d/.test(clean)
      ) {
        mrzLine2 = clean;
      }
    }

    if (mrzLine1) {
      // === 1. PARSE NAME (MRZ Line 1) ===
      // Format: P<CCCSURNAME<<GIVEN<NAMES<<<<
      const nameSection = mrzLine1.substring(5); // Skip 'P<OMN'
      const parts = nameSection.split("<<");
      const surname = parts[0].replace(/</g, " ").trim();
      const given = parts.length > 1 ? parts[1].replace(/</g, " ").trim() : "";

      fullName = `${surname} ${given}`.trim();

      // === 2. PARSE PASSPORT NO (MRZ Line 2) ===
      // ✅ FIX: Use ONLY the first 9 characters (Standard TD3 Passport)
      if (mrzLine2) {
        // Take first 9 chars
        let rawNumber = mrzLine2.substring(0, 9);
        // Remove filler '<' if number is shorter than 9 digits
        idNumber = rawNumber.replace(/</g, "").trim();
      }
    }

    // --- STRATEGY 2: IF NO PASSPORT DETECTED, USE MYKAD LOGIC ---
    if (!idNumber) {
      let icIndex = -1;
      const icRegex = /(\d{6})[-]?(\d{2})[-]?(\d{4})/;

      // 1. Find IC Number
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(icRegex);
        if (match) {
          idNumber = `${match[1]}-${match[2]}-${match[3]}`;
          icIndex = i;
          break;
        }
      }

      // 2. Find Name (Look immediately after IC)
      let nameParts: string[] = [];
      if (icIndex !== -1) {
        for (let i = icIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (/\d/.test(line)) break; // Stop at address
          if (isNameLine(line)) nameParts.push(line);
        }
      }

      // Fallback: Scan top-down if IC location ambiguous
      if (nameParts.length === 0) {
        for (const line of lines) {
          if (
            isNameLine(line) &&
            line === line.toUpperCase() &&
            line.length > 5
          ) {
            nameParts.push(line);
            break;
          }
        }
      }
      fullName = nameParts.join(" ");
    }

    // Final Cleanup
    fullName = fullName.replace(/[^a-zA-Z\s@\.]/g, "").trim();

    return NextResponse.json({
      ok: true,
      data: {
        name: fullName,
        id_number: idNumber,
      },
    });
  } catch (e: any) {
    console.error("OCR Error:", e);
    return NextResponse.json(
      { error: e.message || "OCR Failed" },
      { status: 500 }
    );
  }
}
