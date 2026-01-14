import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import MarketingClient from "./_components/MarketingClient";
import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
    title: "AI Marketing Suite",
    description: "Generate marketing content using AI.",
    path: "/admin/marketing",
    index: false,
});

export default async function MarketingPage() {
    const gate = await requireAdmin();
    if (!gate.ok) return <div>Access Denied</div>;

    const supabase = await createSupabaseServer();

    // Fetch recent assets
    const { data: assets } = await supabase
        .from("marketing_assets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

    // Fetch existing posts (migration)
    // const { data: posts } = ... (if we want to show them too)

    return (
        <div className="p-4 md:p-6 w-full max-w-[1920px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black uppercase tracking-tight">AI Marketing Suite</h1>
            </div>

            <MarketingClient initialAssets={assets || []} />
        </div>
    );
}
