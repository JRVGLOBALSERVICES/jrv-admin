import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { generateAdCopy, generateImagePrompt, generateRealImage } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, type, includeData, customKeywords } = await req.json();
    const supabase = await createSupabaseServer();

    // 1. Gather Context
    let context: any = {};
    if (includeData) {
      // ... (context gathering remains same) ...
      const [carsRes, pagesRes, statsRes] = await Promise.all([
        supabase.from("cars").select("car_catalog(make, model), status").eq("status", "available").limit(5),
        supabase.from("landing_pages").select("title, slug").limit(5),
        supabase.from("site_events").select("page_url").order("created_at", { ascending: false }).limit(20)
      ]);
      context = { available_cars: carsRes.data, landing_pages: pagesRes.data, recent_traffic: statsRes.data };
    }

    // Add manual keywords to context if provided
    if (customKeywords && Array.isArray(customKeywords)) {
        context.custom_keywords = customKeywords;
    }

    // 2. Generate Content via Gemini
    // 2. Generate Content via Gemini
    let result: any;
    
    if (type === "copy") {
       result = await generateAdCopy(context, prompt);
    } 
    else if (type === "image_prompt_refine") {
        // Step 1: Just get the refined prompt text
        result = await generateImagePrompt(context, prompt);
    }
    else if (type === "image_generate") { 
       // Step 2: Generate 3 ACTUAL images
       // prompt here is the refined prompt
       const images = await generateRealImage(prompt, 3);
       result = images; // Array of 3 URLs
    } 
    else {
       return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 3. Save to Assets DB (Only if it's a final generation or valid copy)
    // If it's just 'refine', we might not save it yet, OR we save it as a 'draft'
    // For now, let's only save 'copy' and 'image_generate' (the final images)
    
    let asset = null;
    if (type === "copy" || type === "image_generate") {
        const { data, error } = await supabase.from("marketing_assets").insert({
            type: type === "image_generate" ? "image" : "copy", 
            content: typeof result === "string" ? result : JSON.stringify(result),
            prompt,
            context: includeData ? context : {},
            created_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        asset = data;
    }

    return NextResponse.json({ ok: true, asset, result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
