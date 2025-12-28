export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/admin/upload", {
    method: "POST",
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");

  return json.url as string;
}
