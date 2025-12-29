import { requireAdmin } from "@/lib/auth/requireAdmin";
import { pageMetadata } from "@/lib/seo";
import PostsClient from "./_components/PostsClient";

export const metadata = pageMetadata({
  title: "FB Posts & Videos",
  description: "Manage Facebook posts and video content.",
  path: "/admin/posts",
});

export default async function PostsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {gate.message}
        </div>
      </div>
    );
  }

  return <PostsClient />;
}