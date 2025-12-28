import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/auth/requireAdmin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  if (!process.env.CLOUDINARY_CLOUD_NAME) return jsonError("Missing CLOUDINARY_CLOUD_NAME", 500);
  if (!process.env.CLOUDINARY_API_KEY) return jsonError("Missing CLOUDINARY_API_KEY", 500);
  if (!process.env.CLOUDINARY_API_SECRET) return jsonError("Missing CLOUDINARY_API_SECRET", 500);

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  // ✅ UNIQUE ID so uploads never overwrite each other
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "jrv/cars",
      public_id: unique,          // ✅ unique per upload
      overwrite: false,           // ✅ do NOT overwrite
      resource_type: "image",
    });

    return NextResponse.json({ ok: true, url: result.secure_url });
  } catch (e: any) {
    return jsonError(e?.message || "Upload failed", 500);
  }
}
