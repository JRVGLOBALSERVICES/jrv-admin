"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button"; // ✅ Import

// ... (Types and logic remain unchanged) ...

type Post = {
  id: string;
  title: string;
  content_url: string;
  description: string;
  type: string;
  show_text: boolean;
  created_at: string;
};

export default function PostsClient() {
  // ... (State logic unchanged) ...
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "video">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [editPost, setEditPost] = useState<Partial<Post> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetch("/admin/posts/api")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setPosts(json.rows);
        setLoading(false);
      });
  }, []);

  const filteredPosts = useMemo(() => {
    let res = [...posts];
    if (typeFilter !== "all") res = res.filter((p) => p.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    res.sort((a, b) => {
      const d1 = new Date(a.created_at).getTime();
      const d2 = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? d2 - d1 : d1 - d2;
    });
    return res;
  }, [posts, typeFilter, search, sortOrder]);

  const save = async () => {
    const action = editPost?.id ? "update" : "create";
    const res = await fetch("/admin/posts/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: editPost }),
    });
    if (res.ok) window.location.reload();
    else alert("Failed to save");
  };

  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch("/admin/posts/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", payload: { id } }),
    });
    if (res.ok) setPosts((p) => p.filter((x) => x.id !== id));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">FB Posts & Videos</h1>
        <Button
          onClick={() => {
            setEditPost({});
            setModalOpen(true);
          }}
        >
          + New Post
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50">
        <div className="md:col-span-2">
          <input
            placeholder="Search title or content..."
            className="w-full border rounded-lg px-3 py-2 h-10 focus:ring-2 focus:ring-black/20 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 bg-white h-10"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option value="all">All Types</option>
          <option value="post">Posts</option>
          <option value="video">Videos</option>
        </select>
        <select
          className="border rounded-lg px-3 py-2 bg-white h-10"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </Card>

      <div className="text-sm text-gray-500">
        Showing {filteredPosts.length} result(s)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPosts.map((p) => (
          <Card
            key={p.id}
            className="p-4 flex flex-col gap-2 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div
                className={`text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                  p.type === "video"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {p.type}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="font-semibold line-clamp-2">
              {p.title || "(No Title)"}
            </div>
            <div className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap bg-gray-50 p-2 rounded min-h-16">
              {p.description}
            </div>

            {p.content_url && (
              <a
                href={p.content_url}
                target="_blank"
                className="text-xs text-blue-600 underline truncate block mt-1"
                rel="noreferrer"
              >
                View on Facebook ↗
              </a>
            )}

            <div className="mt-auto pt-4 flex gap-2 border-t">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  setEditPost(p);
                  setPreviewOpen(true);
                }}
              >
                Preview
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditPost(p);
                  setModalOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => del(p.id)}
                className="px-3"
              >
                ✕
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">
              {editPost?.id ? "Edit Post" : "New Post"}
            </h2>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">
                Title
              </label>
              <input
                className="w-full border rounded p-2"
                value={editPost?.title || ""}
                onChange={(e) =>
                  setEditPost({ ...editPost, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">
                URL
              </label>
              <input
                className="w-full border rounded p-2"
                value={editPost?.content_url || ""}
                onChange={(e) =>
                  setEditPost({ ...editPost, content_url: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Type
                </label>
                <select
                  className="w-full border rounded p-2 bg-white"
                  value={editPost?.type || "post"}
                  onChange={(e) =>
                    setEditPost({ ...editPost, type: e.target.value })
                  }
                >
                  <option value="post">Post</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPost?.show_text}
                    onChange={(e) =>
                      setEditPost({ ...editPost, show_text: e.target.checked })
                    }
                  />
                  <span className="text-sm select-none">Show Full Text?</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">
                Description / Content
              </label>
              <textarea
                className="w-full border rounded p-2 h-32 text-sm"
                value={editPost?.description || ""}
                onChange={(e) =>
                  setEditPost({ ...editPost, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button sound="on" haptics="on"variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button sound="on" haptics="on"onClick={save}>Save</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                  JRV
                </div>
                <div>
                  <div className="font-bold text-sm">JRV Global Services</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {editPost.created_at
                      ? new Date(editPost.created_at).toDateString()
                      : "Just now"}{" "}
                    • 🌎
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {editPost.description || "No description provided."}
              </div>
              <div className="bg-gray-100 aspect-video w-full flex flex-col items-center justify-center text-gray-500 border-y relative group">
                {editPost.type === "video" ? (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2">▶</span>
                    <span className="text-xs font-medium">Video Content</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-4xl mb-2">🖼️</span>
                    <span className="text-xs font-medium">Image Content</span>
                  </div>
                )}
                {editPost.content_url && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={editPost.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:scale-105 transition-transform"
                    >
                      Open on Facebook ↗
                    </a>
                  </div>
                )}
              </div>
              <div className="p-2 border-b">
                <div className="flex text-gray-500 text-sm font-medium">
                  <div className="flex-1 text-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                    Like
                  </div>
                  <div className="flex-1 text-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                    Comment
                  </div>
                  <div className="flex-1 text-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                    Share
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 shrink-0">
              <Button
                fullWidth
                variant="secondary"
                onClick={() => setPreviewOpen(false)}
                sound="on"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
