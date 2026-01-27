export async function uploadImage(file: File): Promise<string> {
  // 1. Get Signature & Credentials from Server
  const sigRes = await fetch("/admin/upload", { method: "POST" });
  const sigData = await sigRes.json();
  if (!sigRes.ok) throw new Error(sigData.error || "Failed to get upload signature");

  const { signature, timestamp, public_id, folder, api_key, cloud_name } = sigData;

  // 2. Direct Upload to Cloudinary (Bypassing Server)
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", api_key);
  fd.append("timestamp", timestamp);
  fd.append("public_id", public_id);
  fd.append("folder", folder);
  fd.append("signature", signature);
  fd.append("overwrite", "false");
  fd.append("resource_type", "auto");

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
    {
      method: "POST",
      body: fd,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Cloudinary upload failed");

  return uploadData.secure_url;
}
