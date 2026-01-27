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

  // Return Signature for Direct Upload (Bypasses Server Body Limit)
  const timestamp = Math.round(new Date().getTime() / 1000);
  const public_id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const folder = "jrv/evidence";

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      public_id,
      overwrite: false,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    ok: true,
    signature,
    timestamp,
    public_id,
    folder,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  });
}
