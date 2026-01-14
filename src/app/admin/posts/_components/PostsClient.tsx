"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Eye, PenLine, Trash2, Video, Image as ImageIcon, Search, Facebook, Instagram, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";

type Post = {
  id: string;
  title: string;
  content_url: string;
  description: string;
  type: string;
  created_at: string;
  image_url?: string;
};

function ScraperLog({ postId, onFinished }: { postId: string, onFinished?: () => void }) {
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await fetch(`/admin/posts/api/logs?post_id=${postId}`);
        const data = await res.json();
        if (data.ok && data.log) {
          const msg = data.log.details.message;
          setLog(msg);

          // Trigger refresh if we hit a terminal state
          if (msg.includes("Success") || msg.includes("Failure") || msg.includes("Error")) {
            console.log(`[SCRAPER] Terminal state detected: "${msg}". Triggering refresh...`);
            onFinished?.();
          }
        }
      } catch (e) {
        // quiet
      }
    };

    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, [postId]);

  if (!log) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 animate-pulse">
      <div className="w-1 h-1 rounded-full bg-indigo-400" />
      <span className="text-[10px] text-indigo-400 font-medium italic truncate max-w-[200px]">
        {log}
      </span>
    </div>
  );
}


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

  // Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPageId, setImportPageId] = useState("");
  const [importToken, setImportToken] = useState("");
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);

  // Extraction State
  const [extracting, setExtracting] = useState(false);
  // Auto-Extract logic removed as per user request (skip local API extraction)


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

  const refresh = async () => {
    const res = await fetch("/admin/posts/api");
    const json = await res.json();
    if (json.ok) setPosts(json.rows);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredPosts = useMemo(() => {
    // 1. Filter by Platform Type
    let res = posts.filter(p => config.types.includes(p.type));

    // 2. Filter by UI Type Selector (Post vs Video)
    if (typeFilter !== "all") {
      if (typeFilter === 'post') {
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
    res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res;
  }, [posts, typeFilter, search, config]);

  const save = async () => {
    const action = editPost?.id ? "update" : "create";
    let finalPayload = { ...editPost };
    if (!finalPayload.type) finalPayload.type = config.defaultType;
    setExtracting(true);
    const res = await fetch("/admin/posts/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: finalPayload }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.github_pat_missing) {
        alert("⚠️ WARNING: Post saved, but GITHUB_PAT is missing in your environment variables. Image extraction will NOT start.");
      }
      setTimeout(() => window.location.reload(), 1500);
    } else {
      alert("Failed to save");
      setExtracting(false);
    }
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

  const fetchToImport = async () => {
    if (!importPageId || !importToken) return alert("Page ID and Access Token are required");
    setImportLoading(true);
    try {
      const res = await fetch("/admin/posts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, page_id: importPageId, access_token: importToken }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[IMPORT] Failed to fetch posts:", res.status, txt);
      } else {
        console.log(`[IMPORT] 🚀 Successfully fetched posts for page: ${importPageId}`);
      }
      const json = await res.json();
      if (json.ok) {
        setImportResults(json.data);
      } else {
        alert(json.error || "Failed to fetch posts");
      }
    } catch (e) {
      console.error("[IMPORT] Critical error during fetch:", e);
      alert("Error fetching posts");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImport = async () => {
    const selected = importResults.filter((_, i) => selectedImportIndices.includes(i));
    if (selected.length === 0) return alert("Select at least one post");

    setImportLoading(true);
    try {
      for (const post of selected) {
        await fetch("/admin/posts/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", payload: post }),
        });
      }
      alert("Imported successfully!");
      window.location.reload();
    } catch (e) {
      alert("Error during import");
    } finally {
      setImportLoading(false);
    }
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
        <div className="flex gap-2">
          <Button
            variant="emeraldGreen"
            className="p-6"
            onClick={() => setImportModalOpen(true)}
          >
            <config.icon className="w-4 h-4 mr-2" />
            Import from {platform === 'facebook' ? 'FB' : 'IG'}
          </Button>
          <Button
            variant="indigoLight"
            className="p-6"
            onClick={() => {
              setEditPost({});
              setModalOpen(true);
            }}
          >
            + New Post
          </Button>
        </div>
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
                    <td className="px-4 py-3 text-start">
                      {p.image_url === 'EXTRACTING' ? (
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-1" />
                          <ScraperLog postId={p.id} onFinished={refresh} />
                        </div>
                      ) : (
                        <div className="font-bold text-gray-900 mb-0.5">{p.title || "(No Title)"}</div>
                      )}
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

              {/* Extracted Image Preview in Edit Modal */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  Extracted Cover Image
                </label>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border flex items-center justify-center">
                  {(extracting || editPost?.image_url === 'EXTRACTING') ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span className="text-xs">Extracting metadata...</span>
                      {editPost?.id && <ScraperLog postId={editPost.id} onFinished={refresh} />}
                    </div>
                  ) : editPost?.image_url ? (
                    <div className="relative w-full h-full group">
                      <img src={editPost.image_url} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="secondary" onClick={() => setEditPost({ ...editPost, image_url: '' })}>
                          <Trash2 className="w-3 h-3 mr-1" /> Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      {editPost?.content_url ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-indigo-300 animate-pulse" />
                          <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Ready to Extract</p>
                          <p className="text-[10px] text-gray-400 italic">Hit "Save Changes" to start the background scraper.</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Enter a URL to auto-extract.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Hidden Input for image_url if manual override needed (optional) */}
              </div>

            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button className="p-6" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button className="p-6" onClick={save} disabled={loading || extracting}>
                {extracting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal - Replicating Frontend StaticNewsCard */}
      {previewOpen && editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 border border-black/5">
            <div className="p-4 border-b flex items-center justify-between shrink-0 bg-white">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Frontend Preview</span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar grow bg-white p-8">
              {/* Card Container mimicking .embedItemWrapper */}
              <div className="group bg-white border border-black/5 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-400 ease-[cubic-bezier(0.165,0.84,0.44,1)] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-[#ff3057]/30 flex flex-col h-full overflow-hidden">
                {/* Header / Title Section */}
                <div className="p-6 pb-2">
                  <h3 className="text-[1.15rem] font-bold text-gray-900 leading-tight m-0 transition-colors duration-300 group-hover:text-[#ff3057]">
                    {editPost.title || "Latest News"}
                  </h3>
                  {editPost.created_at && (
                    <span className="text-[0.85rem] color-[#999] mt-1 block text-gray-400">
                      {new Date(editPost.created_at).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>

                {/* 16:9 Media Container */}
                <div className="mx-6 my-4 aspect-video rounded-[16px] overflow-hidden bg-black relative group flex items-center justify-center">
                  {editPost.image_url === 'EXTRACTING' ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <span className="text-xs font-bold uppercase tracking-widest">Extracting Image...</span>
                      {editPost.id && <ScraperLog postId={editPost.id} onFinished={refresh} />}
                    </div>
                  ) : editPost.image_url ? (
                    <img
                      src={editPost.image_url}
                      alt={editPost.title}
                      className="w-full h-full object-cover transition-all duration-500 grayscale group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                    </div>
                  )}

                  {/* Video Play Button Overlay */}
                  {editPost.type?.includes("video") && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-10 border-t-transparent border-l-18 border-l-white border-b-10 border-b-transparent ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Description & Hashtags Section */}
                <div className="px-6 pb-6 grow">
                  <div className="text-[0.95rem] text-gray-600/80 leading-[1.6] text-justify line-clamp-12 min-h-[4.8em]">
                    {editPost.description ? (
                      editPost.description.replace(/(#\w+)/g, "").replace(/\s\s+/g, " ").trim().split(/\s+/).length > 50
                        ? editPost.description.replace(/(#\w+)/g, "").replace(/\s\s+/g, " ").trim().split(/\s+/).slice(0, 50).join(" ") + "..."
                        : editPost.description.replace(/(#\w+)/g, "").replace(/\s\s+/g, " ").trim()
                    ) : (
                      "No description provided."
                    )}
                  </div>

                  {/* Hashtags Section */}
                  {editPost.description && (editPost.description.match(/(#\w+)/g) || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(editPost.description.match(/(#\w+)/g) || []).map((tag: string, idx: number) => (
                        <span key={idx} className="text-[#F15828] font-semibold px-1 rounded hover:bg-[#ff3057]/10 hover:text-[#ff3057] transition-all cursor-pointer text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Read More Pill Button */}
                  <div className="mt-6">
                    <div
                      className="inline-block bg-[#ff3057] text-white text-[0.8rem] font-bold uppercase tracking-wider px-6 py-3 rounded-full shadow-[0_4px_10px_rgba(255,48,87,0.3)] opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-[#e62a4d] hover:scale-[1.02] hover:shadow-[0_6px_15px_rgba(255,48,87,0.4)] transition-all duration-300 cursor-pointer"
                    >
                      Read More &rarr;
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button variant="secondary" className="p-6" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
              {editPost.content_url && (
                <Button className="p-6" onClick={() => window.open(editPost.content_url, "_blank")}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  View Original post
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <config.icon className={`w-5 h-5 ${config.color}`} />
                Import from {platform === 'facebook' ? 'Facebook' : 'Instagram'}
              </h2>
              <button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  {platform === 'facebook' ? 'Page ID' : 'IG Business ID'}
                </label>
                <input
                  className={inputClass}
                  value={importPageId}
                  onChange={(e) => setImportPageId(e.target.value)}
                  placeholder="e.g. 1029384756..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  Access Token
                </label>
                <input
                  className={inputClass}
                  type="password"
                  value={importToken}
                  onChange={(e) => setImportToken(e.target.value)}
                  placeholder="Paste your token here..."
                />
              </div>
            </div>

            <Button
              className="w-full h-12 p-6"
              onClick={fetchToImport}
              disabled={importLoading}
            >
              {importLoading ? "Fetching..." : "Fetch Latest Content"}
            </Button>

            {importResults.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">{importResults.length} Posts Found</span>
                  <button
                    className="text-xs text-blue-600 font-bold hover:underline"
                    onClick={() => {
                      if (selectedImportIndices.length === importResults.length) setSelectedImportIndices([]);
                      else setSelectedImportIndices(importResults.map((_, i) => i));
                    }}
                  >
                    {selectedImportIndices.length === importResults.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {importResults.map((res, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex gap-3 transition-all cursor-pointer ${selectedImportIndices.includes(i) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}
                      onClick={() => {
                        if (selectedImportIndices.includes(i)) setSelectedImportIndices(p => p.filter(x => x !== i));
                        else setSelectedImportIndices(p => [...p, i]);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImportIndices.includes(i)}
                        readOnly
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate">{res.title}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1">{res.description}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-1">
                          {new Date(res.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {res.content_url && (
                        <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0 border">
                          <img src={res.content_url} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="secondary" className="flex-1 h-12 p-6" onClick={() => setImportModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 p-6"
                    onClick={handleImport}
                    disabled={importLoading || selectedImportIndices.length === 0}
                  >
                    {importLoading ? "Importing..." : `Import ${selectedImportIndices.length} Item(s)`}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
