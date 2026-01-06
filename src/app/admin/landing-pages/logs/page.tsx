import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import LandingPageLogsClient from "./_components/LandingPageLogsClient";
import { LandingPageLogTable } from "./_components/LandingPageLogTable";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = pageMetadata({
    title: "Landing Page Audit Logs",
    description: "View edit/delete actions for landing pages.",
    path: "/admin/landing-pages/logs",
    index: false,
});

export const dynamic = "force-dynamic";

export default async function LandingPageLogsPage({ searchParams }: { searchParams: Promise<any> }) {
    const sp = await searchParams;
    const supabase = await createSupabaseServer();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect("/");
    const gate = await requireSuperadmin();
    if (!gate.ok) redirect("/admin");

    // Initial Fetches
    const [adminsRes, pagesRes] = await Promise.all([
        supabase.from("admin_users").select("user_id, email"),
        supabase.from("landing_pages").select("id, menu_label, slug")
    ]);

    const actorEmailMap = new Map(adminsRes.data?.map(a => [a.user_id, a.email]));
    const pageLabelMap = new Map(pagesRes.data?.map(p => [p.id, p.menu_label || p.slug || "Unknown Page"]));
    const pageSlugMap = new Map(pagesRes.data?.map(p => [p.id, p.slug]));

    // 1. Build Query
    let query = supabase
        .from("landing_page_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

    // 2. Apply Server-side Filters
    if (sp.action) query = query.eq("action", sp.action);
    if (sp.actor_user_id) query = query.eq("actor_user_id", sp.actor_user_id);
    if (sp.landing_page_id) query = query.eq("landing_page_id", sp.landing_page_id);

    if (sp.q) {
        const q = String(sp.q).trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        if (isUuid) {
            query = query.or(`id.eq.${q},landing_page_id.eq.${q}`);
        } else {
            query = query.ilike("action", `%${q}%`);
        }
    }

    // 3. Pagination
    const pageIdx = Math.max(1, Number(sp.page || 1));
    const pageSize = Math.max(10, Number(sp.page_size || 50));
    const { data: rawLogs, count } = await query.range((pageIdx - 1) * pageSize, pageIdx * pageSize - 1);

    // 4. Transform for display
    const logs = (rawLogs || []).map(r => ({
        ...r,
        actor_email: actorEmailMap.get(r.actor_user_id),
        landing_page_label: pageLabelMap.get(r.landing_page_id),
        landing_page_slug: pageSlugMap.get(r.landing_page_id)
    }));

    const totalPages = Math.ceil((count || 0) / pageSize);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-3xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                        <ShieldAlert className="text-purple-600" size={32} />
                        Landing Page Logs
                    </div>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Audit trail for all landing page modifications and removals.
                    </p>
                </div>
                <Link href="/admin/landing-pages">
                    <Button variant="secondary" size="sm" className="h-10 px-4 font-bold border-gray-200">
                        <ArrowLeft size={16} className="mr-2" /> Back to Pages
                    </Button>
                </Link>
            </div>

            <LandingPageLogsClient
                initial={{ ...sp, page: pageIdx, page_size: pageSize }}
                meta={{ total: count || 0, totalPages }}
                options={{
                    actors: adminsRes.data || [],
                    landingPages: pagesRes.data || []
                }}
            />

            <LandingPageLogTable logs={logs} />
        </div>
    );
}
