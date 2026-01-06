import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import LandingPagesTable from "./_components/LandingPagesTable";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata = {
    title: "Landing Pages - JRV Admin",
};

export default async function LandingPagesPage() {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
        .from("landing_pages")
        .select("slug, menu_label, category, status")
        .order("category", { ascending: true })
        .order("menu_label", { ascending: true });

    if (error) {
        return <div className="text-red-500">Error: {error.message}</div>;
    }

    const gate = await requireAdmin();
    const role = gate.ok ? gate.role : "admin";
    const isSuperadmin = role === "superadmin";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
                    <p className="text-sm text-gray-500">
                        Manage your SEO landing pages and site navigation.
                    </p>
                </div>
                {isSuperadmin && (
                    <Link href="/admin/landing-pages/new">
                        <Button className="p-6" variant="primary">Create New Page</Button>
                    </Link>
                )}
            </div>

            <LandingPagesTable rows={data as any[]} />
        </div>
    );
}
