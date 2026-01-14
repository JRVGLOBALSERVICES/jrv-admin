"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { Sparkles, Image as ImageIcon, FileText, BarChart3, Globe, Copy, Check, Loader2, LayoutGrid, Plus, ExternalLink, Trash, RotateCcw } from "lucide-react";

type Asset = {
    id: string;
    type: "image" | "copy" | "video";
    content: string;
    prompt: string;
    created_at: string;
};

export default function MarketingClient({ initialAssets }: { initialAssets: Asset[] }) {
    const [activeTab, setActiveTab] = useState<"studio" | "assets">("studio");
    const [assets, setAssets] = useState(initialAssets);

    // Generation State
    const [step, setStep] = useState<"initial" | "refining" | "results">("initial");
    const [prompt, setPrompt] = useState("");
    const [refinedPrompt, setRefinedPrompt] = useState("");
    const [logoUrl, setLogoUrl] = useState<string>("");

    const [genType, setGenType] = useState<"copy" | "image_prompt">("copy");
    const [includeContext, setIncludeContext] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState("");

    // Initial "Generate" -> Refine (for images) or Final (for copy)
    const handleInitialGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            if (genType === 'image_prompt') {
                // Step 1: Get refined prompt
                const res = await fetch("/api/admin/marketing/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, type: "image_prompt_refine", includeData: includeContext })
                });
                const data = await res.json();
                if (data.ok) {
                    setRefinedPrompt(data.result);
                    setStep("refining");
                } else alert(data.error);
            } else {
                // Copy: Generate immediately
                const res = await fetch("/api/admin/marketing/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, type: "copy", includeData: includeContext })
                });
                const data = await res.json();
                if (data.ok) {
                    setLastResult(data.result);
                    // Auto-select generated keywords
                    if (data.result.keywords) setSelectedKeywords(data.result.keywords);
                    setAssets([data.asset, ...assets]);
                } else alert(data.error);
            }
        } catch (e) { alert("Error"); }
        finally { setIsGenerating(false); }
    };

    // Final "Generate 3 Images"
    const handleFinalGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/marketing/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: refinedPrompt, type: "image_generate", includeData: includeContext })
            });
            const data = await res.json();
            if (data.ok) {
                setLastResult(data.result); // Array of 3 URLs
                if (data.asset) setAssets([data.asset, ...assets]);
                setStep("results");
            } else alert(data.error);
        } catch (e) { alert("Error"); }
        finally { setIsGenerating(false); }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.ok) setLogoUrl(data.url);
            else alert("Upload failed");
        } catch (e) { alert("Upload error"); }
    };

    const applyOverlay = (imageUrl: string, logo: string) => {
        try {
            // 1. Extract Public ID from Cloudinary URL for native overlay (more robust than fetch)
            // Pattern: .../upload/(v<version>/)?(<public_id>)(.<extension>)?
            // Example: https://res.cloudinary.com/demo/image/upload/v12345/folder/logo.png -> folder/logo

            if (logo.includes("res.cloudinary.com")) {
                const parts = logo.split("/upload/");
                if (parts.length === 2) {
                    let path = parts[1];
                    // Remove version if present (e.g., v1767781497/)
                    if (path.startsWith("v")) {
                        path = path.replace(/^v\d+\//, "");
                    }
                    // Remove extension (e.g., .png)
                    path = path.replace(/\.[^/.]+$/, "");

                    // Cloudinary layers use ':' instead of '/' for folder text
                    const publicId = path.replace(/\//g, ":");

                    // Layer transformation: Overlay 'publicId' on bottom right
                    const insertion = `/l_${publicId}/fl_layer_apply,g_south_east,w_0.25,x_10,y_10`;
                    return imageUrl.replace("/upload/", `/upload${insertion}/`);
                }
            }

            // Fallback for non-Cloudinary URLs (use l_fetch)
            const base64Data = btoa(logo);
            const safeB64 = base64Data.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const insertion = `/l_fetch:${safeB64}/fl_layer_apply,g_south_east,w_0.25,x_10,y_10`;
            return imageUrl.replace("/upload/", `/upload${insertion}/`);

        } catch (e) {
            console.error("Overlay error", e);
            return imageUrl;
        }
    };

    const [isSavingAsset, setIsSavingAsset] = useState(false);

    const saveAsset = async (content: string) => {
        setIsSavingAsset(true);
        try {
            const res = await fetch("/api/admin/marketing/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    content, // Save just this single URL as content
                    prompt: refinedPrompt || prompt,
                    context: includeContext ? { saved_from_batch: true } : {}
                })
            });
            const data = await res.json();
            if (data.ok) {
                alert("Saved to library!");
                setAssets([data.asset, ...assets]);
            } else {
                alert("Failed to save");
            }
        } catch (e) { alert("Error saving"); }
        finally { setIsSavingAsset(false); }
    };

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/marketing/assets?id=${deleteId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.ok) {
                setAssets(assets.filter(a => a.id !== deleteId));
                setDeleteId(null); // Close modal
            } else alert("Failed to delete");
        } catch (e) { alert("Error deleting"); }
        finally { setIsDeleting(false); }
    };

    // Wrapper to trigger modal
    const deleteAsset = (id: string) => setDeleteId(id);

    const handleTweak = () => {
        // Keeps the prompt and logo state, just goes back to refining step
        if (genType === 'image_prompt') setStep("refining");
        else setStep("initial");
    };

    // Keyword Management
    const toggleKeyword = (k: string) => {
        if (selectedKeywords.includes(k)) setSelectedKeywords(selectedKeywords.filter(w => w !== k));
        else setSelectedKeywords([...selectedKeywords, k]);
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        if (!selectedKeywords.includes(newKeyword.trim())) {
            setSelectedKeywords([...selectedKeywords, newKeyword.trim()]);
        }
        setNewKeyword("");
    };

    const handleRegenerateCopy = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/marketing/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    type: "copy",
                    includeData: includeContext,
                    customKeywords: selectedKeywords
                })
            });
            const data = await res.json();
            if (data.ok) {
                setLastResult(data.result);
                setAssets([data.asset, ...assets]);
            } else alert(data.error);
        } catch (e) { alert("Error regenerating"); }
        finally { setIsGenerating(false); }
    };

    // Legacy placeholder for 'generate' if missed
    const generate = handleInitialGenerate;

    return (
        <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-full md:w-fit">
                <TabButton
                    active={activeTab === "studio"}
                    onClick={() => setActiveTab("studio")}
                    icon={Sparkles}
                    label="Gemini AI Studio"
                />
                <TabButton
                    active={activeTab === "assets"}
                    onClick={() => setActiveTab("assets")}
                    icon={LayoutGrid}
                    label="Asset Library"
                />
            </div>

            {/* --- STUDIO TAB --- */}
            {activeTab === "studio" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Step 1: Initial Input */}
                        {step === 'initial' && (
                            <Card className="p-6 space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-indigo-500" />
                                            {genType === 'image_prompt' ? 'Step 1: Describe Concept' : 'Generate Content'}
                                        </h2>
                                    </div>

                                    {/* Content Type Toggles - Stacked on Mobile (2 rows), grid on desktop */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <TypeBadge
                                            active={genType === "copy"}
                                            onClick={() => { setGenType("copy"); setLastResult(null); }}
                                            icon={FileText}
                                            label="Ad Copy Generator"
                                            description="Create catchy captions & text"
                                        />
                                        <TypeBadge
                                            active={genType === "image_prompt"}
                                            onClick={() => { setGenType("image_prompt"); setLastResult(null); }}
                                            icon={ImageIcon}
                                            label="AI Image Generator"
                                            description="Generate stunning visuals"
                                        />
                                    </div>
                                </div>

                                <textarea
                                    className="w-full h-32 p-4 text-sm border rounded-xl focus:ring-2 ring-indigo-500/20 outline-none resize-none bg-gray-50/50"
                                    placeholder={genType === "copy"
                                        ? "Describe your campaign (e.g., 'Promote student car rental discounts in Tanjong Malim')..."
                                        : "Describe the image concept (e.g., 'A shiny red Perodua Myvi driving on a Malaysian highway during sunset')..."
                                    }
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                />

                                <div className="flex items-center justify-between">
                                    <Toggle
                                        label="Use Live Site Data"
                                        checked={includeContext}
                                        onChange={setIncludeContext}
                                    />

                                    <Button variant="indigo" className="w-full md:w-auto md:p-8 p-6" onClick={handleInitialGenerate} disabled={isGenerating || !prompt.trim()}>
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {genType === 'image_prompt' ? 'Next: Refine Prompt' : 'Generate Magic'}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Step 2: Refine & Options (Only for Images) */}
                        {step === 'refining' && genType === 'image_prompt' && (
                            <Card className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-500" />
                                        Step 2: Refine & Options
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setStep('initial')}>Back</Button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500">Refined Prompt (Editable)</label>
                                    <textarea
                                        className="w-full h-32 p-4 text-sm border-2 border-purple-100 rounded-xl focus:ring-2 ring-purple-500/20 outline-none resize-none bg-white"
                                        value={refinedPrompt}
                                        onChange={e => setRefinedPrompt(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500">Overlay Logo (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                    {logoUrl && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Logo uploaded!</p>}
                                </div>

                                <Button className="w-full md:p-6 p-8 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleFinalGenerate} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                    Generate 3 Options
                                </Button>
                            </Card>
                        )}

                        {/* Step 3: Results State - Show "Start New" */}
                        {step === 'results' && (
                            <Card className="p-6 space-y-4 bg-indigo-50 border-indigo-100 flex flex-col items-center justify-center text-center">
                                <Sparkles className="w-12 h-12 text-indigo-500 mb-2" />
                                <h2 className="text-xl font-bold text-indigo-900">Creation Complete!</h2>
                                <p className="text-sm text-indigo-700 max-w-xs">
                                    Your marketing assets have been generated. Review them on the right.
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Button variant="indigoLight" onClick={handleTweak} className="p-10">
                                        <RotateCcw className="w-4 h-4 mr-2" /> Tweak & Regenerate
                                    </Button>
                                    <Button variant="indigo" onClick={() => { setStep('initial'); setLastResult(null); setRefinedPrompt(""); setLogoUrl(""); }} className="p-10 shadow-xl">
                                        <Plus className="w-4 h-4 mr-2" /> Start New Campaign
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="space-y-6">
                        {lastResult ? (
                            <Card className="p-6 min-h-[300px]">
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Generated Result</h3>
                                {genType === "copy" ? (
                                    <div className="space-y-4">
                                        {/* Basic JSON Render for Copy */}
                                        <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                                            <div className="text-lg font-bold">{lastResult.headline || "No headline"}</div>
                                            <div className="text-sm text-gray-600 whitespace-pre-wrap">{lastResult.body}</div>

                                            {/* Keyword Editor */}
                                            <div className="pt-4 border-t border-gray-200">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Keywords (Select to Refine)</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {/* Existing/Generated Keywords */}
                                                    {selectedKeywords.map((k: string) => (
                                                        <button
                                                            key={k}
                                                            onClick={() => toggleKeyword(k)}
                                                            className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full font-medium hover:bg-indigo-700 transition flex items-center gap-1"
                                                        >
                                                            {k} <Check className="w-3 h-3" />
                                                        </button>
                                                    ))}

                                                    {/* Input for new keyword */}
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={newKeyword}
                                                            onChange={e => setNewKeyword(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && addKeyword()}
                                                            placeholder="Add keyword..."
                                                            className="px-2 py-1 text-xs border rounded-full w-24 focus:outline-none focus:border-indigo-500"
                                                        />
                                                        <button onClick={addKeyword} className="p-1 bg-gray-200 rounded-full hover:bg-gray-300">
                                                            <Plus className="w-3 h-3 text-gray-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button className="p-8" variant="indigoLight" onClick={handleRegenerateCopy} disabled={isGenerating}>
                                                <RotateCcw className="w-4 h-4 mr-2" /> Regenerate with Keywords
                                            </Button>
                                            <Button className="p-8" onClick={() => navigator.clipboard.writeText(lastResult.body)}>
                                                <Copy className="w-4 h-4 mr-2" /> Copy Text
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(() => {
                                            let results = lastResult;
                                            if (typeof results === 'string') {
                                                try { results = JSON.parse(results); } catch { }
                                            }
                                            const list = Array.isArray(results) ? results : [results];

                                            return list.map((url: string, i: number) => {
                                                // Apply Logo Overlay if exists
                                                const displayUrl = logoUrl ? applyOverlay(url, logoUrl) : url;
                                                return (
                                                    <div key={i} className="group relative bg-gray-900 rounded-xl overflow-hidden shadow-xl aspect-video">
                                                        <NextImage
                                                            src={displayUrl}
                                                            alt={`Generated ${i + 1}`}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <Button className="p-6" size="sm" variant="secondary" onClick={() => window.open(displayUrl, '_blank')}>
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Button>
                                                            <Button className="p-6" size="sm" variant="secondary" onClick={() => saveAsset(displayUrl)} disabled={isSavingAsset}>
                                                                {isSavingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to assets"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                )}
                            </Card>
                        ) : (
                            step === 'initial' && (
                                <div className="h-full border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-12">
                                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Your AI output will appear here</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* --- ASSETS TAB --- */}
            {activeTab === "assets" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map(asset => {
                        // Parse content safely
                        let content: any = asset.content;
                        let isImage = asset.type === 'image';

                        // If it's an image type, content might be a JSON string of URLs array
                        if (isImage) {
                            try {
                                const parsed = JSON.parse(asset.content);
                                if (Array.isArray(parsed)) content = parsed[0]; // Just show the first one for now
                                else content = parsed;
                            } catch (e) {
                                // It might be a plain string URL (legacy)
                                content = asset.content;
                            }
                        }

                        return (
                            <Card key={asset.id} className="overflow-hidden hover:shadow-md transition flex flex-col">
                                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${asset.type === 'copy' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {asset.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="p-4 text-sm grow">
                                    {asset.type === 'copy' ? (
                                        <p className="line-clamp-6 font-mono text-xs whitespace-pre-wrap">{asset.content}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                                                <NextImage
                                                    src={content}
                                                    alt={asset.prompt}
                                                    fill
                                                    className="object-cover hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50/50 border-t flex items-center justify-between gap-2">
                                    <p className="text-[10px] text-gray-400 truncate grow max-w-[50%]">Prompt: {asset.prompt}</p>
                                    <div className="flex gap-1">
                                        {asset.type === 'copy' ? (
                                            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(asset.content)}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        ) : (
                                            <>
                                                <Button size="sm" variant="secondary" onClick={() => window.open(content, '_blank')}>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Button>
                                                <a href={content} download target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="secondary">
                                                        <Sparkles className="w-3 h-3" />
                                                    </Button>
                                                </a>
                                            </>
                                        )}
                                        <Button size="sm" variant="danger" onClick={() => deleteAsset(asset.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100">
                                            <Trash className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                    {assets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 italic">No assets generated yet. Start in AI Studio!</div>
                    )}
                </div>
            )}




            {/* --- MODAL --- */}
            <Modal
                open={!!deleteId}
                title="Delete Asset"
                description="Are you sure you want to delete this asset? This action cannot be undone."
                onClose={() => setDeleteId(null)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </>
                }
            >
                <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
                    Warning: This will permanently remove the asset from your library.
                </div>
            </Modal>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 md:flex-none p-4 md:p-6 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function TypeBadge({ active, onClick, icon: Icon, label, description }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${active
                ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500/20"
                : "bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                }`}
        >
            <div className={`p-3 rounded-lg ${active ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className={`font-bold ${active ? "text-indigo-900" : "text-gray-700"}`}>{label}</div>
                <div className="text-xs text-gray-500 mt-1">{description}</div>
            </div>
        </button>
    )
}
