"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Eye, PenLine, Trash2, Video, Image as ImageIcon, Search, Facebook, Instagram } from "lucide-react";

type Post = {
  id: string;
  title: string;
  content_url: string;
  description: string;
  type: string;
  show_text: boolean;
  created_at: string;
};

// Unified Input Style conforming to Agreements UI
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";

export default function PostsClient({ platform = 'facebook' }: { platform?: 'facebook' | 'instagram' }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "video">("all");
  const [editPost, setEditPost] = useState<Partial<Post> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Platform-specific configuration
  const config = useMemo(() => {
    return platform === 'instagram' ? {
      title: "Instagram Content",
      desc: "Manage Instagram posts and reels",
      types: ["ig_post", "ig_video"],
      defaultType: "ig_post",
      icon: Instagram,
      color: "text-pink-600"
    } : {
      title: "Facebook Content",
      desc: "Manage Facebook posts and videos",
      types: ["post", "video", "fb_post", "fb_video"],
      defaultType: "post",
      icon: Facebook,
      color: "text-blue-600"
    }
  }, [platform]);

  useEffect(() => {
    fetch("/admin/posts/api")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setPosts(json.rows);
        setLoading(false);
      });
  }, []);

  const filteredPosts = useMemo(() => {
    // 1. Filter by Platform Type
    let res = posts.filter(p => config.types.includes(p.type));

    // 2. Filter by UI Type Selector (Post vs Video)
    if (typeFilter !== "all") {
      if (typeFilter === 'post') {
        // Standardize check
        res = res.filter(p => p.type.includes('post') || p.type === 'post');
      } else {
        res = res.filter(p => p.type.includes('video') || p.type === 'video');
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    // Always newest first
    res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res;
  }, [posts, typeFilter, search]);

  const save = async () => {
    const action = editPost?.id ? "update" : "create";
    // Ensure new posts get the correct type prefix if generic (e.g. 'post' -> 'ig_post' if instagram)
    // But actually, we will enforce the type in the dropdown or default
    let finalPayload = { ...editPost };

    // Fallback: If creating new and no type set, use default for platform
    if (!finalPayload.type) finalPayload.type = config.defaultType;

    const res = await fetch("/admin/posts/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: finalPayload }),
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

  if (loading) return <div className="p-12 text-center text-gray-400">Loading posts...</div>;

  return (
    <div className="pt-6 space-y-6"> {/* Added pt-6 as requested */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="px-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <config.icon className={`w-6 h-6 ${config.color}`} />
            {config.title}
          </h2>
          <p className="text-sm text-gray-500">{config.desc}</p>
        </div>
        <Button
          className="shadow-lg shadow-indigo-200 p-6"
          onClick={() => {
            setEditPost({});
            setModalOpen(true);
          }}
        >
          + New Post
        </Button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search content..."
              className={`${inputClass} pl-10`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <select
              className={inputClass}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="post">Posts</option>
              <option value="video">Videos</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
              <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-32">Date</th>
                  <th className="px-4 py-3 w-24">Type</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPosts.map(p => (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition group">
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("en-MY", {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${p.type === 'video'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : p.type.includes('ig_')
                          ? 'bg-pink-50 text-pink-700 border-pink-100' // IG
                          : 'bg-blue-50 text-blue-700 border-blue-100' // FB
                        }`}>
                        {p.type.includes('video') ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        {p.type.replace('fb_', '').replace('ig_', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900 mb-0.5">{p.title || "(No Title)"}</div>
                      <div className="text-gray-500 text-xs line-clamp-1 max-w-md">{p.description}</div>
                      {p.content_url && (
                        <a href={p.content_url} target="_blank" className="flex items-center gap-1 text-[10px] text-blue-600 mt-1 hover:underline">
                          <ExternalLink className="w-3 h-3" /> View Content
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 p-6"
                          onClick={() => { setEditPost(p); setPreviewOpen(true); }}
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 p-6"
                          onClick={() => { setEditPost(p); setModalOpen(true); }}
                          title="Edit"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-8 p-6 bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                          onClick={() => del(p.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPosts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-400 italic">No posts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold">
              {editPost?.id ? "Edit Post" : "New Post"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  Title
                </label>
                <input
                  className={inputClass}
                  value={editPost?.title || ""}
                  onChange={(e) =>
                    setEditPost({ ...editPost, title: e.target.value })
                  }
                  placeholder="Enter post title..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  Content URL ({platform === 'facebook' ? 'Facebook Link' : 'Instagram Link'})
                </label>
                <input
                  className={inputClass}
                  value={editPost?.content_url || ""}
                  onChange={(e) =>
                    setEditPost({ ...editPost, content_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Type
                  </label>
                  <select
                    className={inputClass}
                    value={editPost?.type || config.defaultType}
                    onChange={(e) =>
                      setEditPost({ ...editPost, type: e.target.value })
                    }
                  >
                    {platform === 'facebook' ? (
                      <>
                        <option value="post">Post (Image)</option>
                        <option value="video">Video</option>
                      </>
                    ) : (
                      <>
                        <option value="ig_post">Instagram Post</option>
                        <option value="ig_video">Instagram Reel/Video</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPost?.show_text}
                      onChange={(e) =>
                        setEditPost({ ...editPost, show_text: e.target.checked })
                      }
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium">Show Full Text?</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  Description
                </label>
                <textarea
                  className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                  value={editPost?.description || ""}
                  onChange={(e) =>
                    setEditPost({ ...editPost, description: e.target.value })
                  }
                  placeholder="Post content descriptions..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button className="p-6" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button className="p-6" onClick={save}>Save Changes</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal - FIXED for Video/Image */}
      {previewOpen && editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-3 border-b flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${platform === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-blue-600'} flex items-center justify-center text-white font-bold shrink-0 text-xs`}>
                  JRV
                </div>
                <div>
                  <div className="font-bold text-xs">JRV Global Services</div>
                  <div className="text-[10px] text-gray-500">Just now • 🌎</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar">
              <div className="p-3 text-sm whitespace-pre-wrap font-sans">
                {editPost.description || "No description provided."}
              </div>

              {/* Media Preview Area */}
              <div className="bg-black aspect-square w-full flex flex-col items-center justify-center text-gray-500 relative group overflow-hidden">
                {editPost.type?.includes('video') ? (
                  // Video Placeholder or iframe if embeddable
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                      <span className="text-3xl ml-1 text-white">▶</span>
                    </div>
                    <p className="text-white/60 text-xs">Video Preview</p>
                    {editPost.content_url && (
                      <p className="text-[10px] text-white/40 mt-2 truncate w-48 mx-auto">{editPost.content_url}</p>
                    )}
                  </div>
                ) : (
                  // Image Placeholder
                  <div className="text-center p-6">
                    <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-2" />
                    <p className="text-white/60 text-xs">Image Preview</p>
                  </div>
                )}

                {/* Overlay Action */}
                {editPost.content_url && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={editPost.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Original
                    </a>
                  </div>
                )}
              </div>

              <div className="p-2 border-b bg-gray-50">
                <div className="flex text-gray-500 text-xs font-medium">
                  <div className="flex-1 text-center py-2">Like</div>
                  <div className="flex-1 text-center py-2">Comment</div>
                  <div className="flex-1 text-center py-2">Share</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
