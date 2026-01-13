import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok)
    return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { page_id, access_token, platform } = await req.json();

  if (!page_id || !access_token) {
    return NextResponse.json(
      { error: "Page ID and Access Token are required" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch posts from Facebook Graph API
    // fields: message, full_picture, created_time, type, permalink_url
    // If Instagram, we use different fields (caption, media_url, timestamp, media_type, permalink)

    let url = "";
    if (platform === "instagram") {
      // Note: To fetch IG posts via Page ID, you need the IG Business ID.
      // For simplicity, we assume the user provides the IG Business ID as page_id if platform is IG.
      url = `https://graph.facebook.com/v19.0/${page_id}/media?fields=caption,media_url,timestamp,media_type,permalink&access_token=${access_token}`;
    } else {
      url = `https://graph.facebook.com/v19.0/${page_id}/posts?fields=message,full_picture,created_time,attachments{media_type,url,type},type,permalink_url&access_token=${access_token}`;
    }

    const response = await fetch(url);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message);
    }

    // 2. Transform to our fb_posts schema
    const posts = (json.data || []).map((item: any) => {
      if (platform === "instagram") {
        return {
          title: item.caption
            ? item.caption.slice(0, 50) +
              (item.caption.length > 50 ? "..." : "")
            : "Instagram Post",
          description: item.caption || "",
          content_url: item.media_url || "",
          type: item.media_type === "VIDEO" ? "ig_video" : "ig_post",
          external_url: item.permalink || "",
          created_at: item.timestamp || new Date().toISOString(),
          show_text: true,
        };
      } else {
        return {
          title: item.message
            ? item.message.slice(0, 50) +
              (item.message.length > 50 ? "..." : "")
            : "Facebook Post",
          description: item.message || "",
          content_url: item.full_picture || "",
          type: item.type === "video" ? "fb_video" : "fb_post",
          external_url: item.permalink_url || "",
          created_at: item.created_time || new Date().toISOString(),
          show_text: true,
        };
      }
    });

    return NextResponse.json({ ok: true, data: posts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
