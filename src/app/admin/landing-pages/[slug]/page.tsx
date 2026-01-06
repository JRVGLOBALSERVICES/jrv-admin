import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import LandingPageForm from "../_components/LandingPageForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
    title: "Edit Page - JRV Admin",
};

type PageProps = {
    params: Promise<{ slug: string }>;
};

export default async function EditLandingPagesPage({ params }: PageProps) {
    const gate = await requireAdmin();
    if (!gate.ok) {
        return <div className="text-red-600 p-6">{gate.message}</div>;
    }

    const { slug } = await params;

    const isNew = slug === "new";
    let initialData = null;

    if (!isNew) {
        const supabase = await createSupabaseServer();
        const { data, error } = await supabase
            .from("landing_pages")
            .select("*")
            .eq("slug", slug)
            .single();

        if (error || !data) {
            return notFound();
        }
        initialData = data;
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-gray-100 pb-4 md:pb-0 md:border-0">
                <Link
                    href="/admin/landing-pages"
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-gray-50 px-3 py-2 rounded-lg self-start md:self-auto"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 line-clamp-1">
                    {isNew ? "Create New Page" : `Edit: ${initialData?.menu_label}`}
                </h1>
            </div>

            <LandingPageForm
                initialData={initialData}
                isNew={isNew}
                role={gate.role}
            />
        </div>
    );
}
