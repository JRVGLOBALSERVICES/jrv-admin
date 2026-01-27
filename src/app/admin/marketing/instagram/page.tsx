import { requireAdmin } from "@/lib/auth/requireAdmin";
import PostsClient from "../../posts/_components/PostsClient";

export const metadata = {
    title: "Instagram Posts | JRV Admin",
};

export default async function InstagramPage() {
    const gate = await requireAdmin();
    if (!gate.ok) return <div>Access Denied</div>;

    return (
        <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black uppercase tracking-tight text-pink-600">Instagram Posts</h1>
            </div>
            <div className="bg-white rounded-xl border p-1 shadow-sm">
                <PostsClient platform="instagram" />
            </div>
        </div>
    );
}
