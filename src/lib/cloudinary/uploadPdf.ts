// src/lib/cloudinary/uploadPdf.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function uploadPdfBufferToCloudinary(opts: {
  buffer: Buffer;
  publicId: string;
  folder?: string;
}) {
  const folder = opts.folder ?? "jrv/agreements";
  const publicId = `${folder}/${String(opts.publicId).replace(/[^a-zA-Z0-9/_-]/g, "_")}`;

  return await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "upload",
        public_id: publicId,
        overwrite: true,
        format: "pdf",
        use_filename: false,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result?.secure_url) return reject(new Error("Cloudinary upload failed"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    stream.end(opts.buffer);
  });
}
