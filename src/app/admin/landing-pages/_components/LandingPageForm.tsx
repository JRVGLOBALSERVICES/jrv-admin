"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { upsertLandingPage, deleteLandingPage } from "@/lib/actions/landing-pages";
import { Trash2, ClipboardList } from "lucide-react";
import Link from "next/link";

type Props = {
    initialData?: any;
    isNew?: boolean;
    role?: string;
};

export default function LandingPageForm({ initialData, isNew, role }: Props) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [lang, setLang] = useState<"bm" | "en">("bm");
    const [showPreview, setShowPreview] = useState(false);
    const [imageLoading, setImageLoading] = useState<boolean[]>([false, false, false]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal state
    const [modal, setModal] = useState<{ open: boolean; title: string; message: string; type: "info" | "error" }>({
        open: false,
        title: "",
        message: "",
        type: "info"
    });

    const showMsg = (title: string, message: string, type: "info" | "error" = "info") => {
        setModal({ open: true, title, message, type });
    };

    // Form state for preview
    const [formData, setFormData] = useState(() => {
        const base = isNew ? { category: "location", status: "active" } : {};
        const data = { ...base, ...initialData };
        // Ensure images is always an array of 3 strings
        const images = Array.isArray(data.images) ? [...data.images] : ["", "", ""];
        const imagePrompts = Array.isArray(data.image_prompts) ? [...data.image_prompts] : ["", "", ""];
        while (images.length < 3) images.push("");
        while (imagePrompts.length < 3) imagePrompts.push("");
        return { ...data, images, imagePrompts };
    });

    const isSuperadmin = role === "superadmin";
    const canEdit = isNew || isSuperadmin;

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (index: number, value: string) => {
        const newImages = [...formData.images];
        newImages[index] = value;
        setFormData((prev: any) => ({ ...prev, images: newImages }));
    };

    const handlePromptChange = (index: number, value: string) => {
        const newPrompts = [...formData.imagePrompts];
        newPrompts[index] = value;
        setFormData((prev: any) => ({ ...prev, imagePrompts: newPrompts }));
    };

    const handleGenerateImage = async (index: number) => {
        const prompt = formData.imagePrompts[index];
        if (!prompt) return showMsg("Missing Prompt", "Please enter or generate a prompt first.", "error");

        const newLoading = [...imageLoading];
        newLoading[index] = true;
        setImageLoading(newLoading);

        try {
            const { generateImageWithGemini } = await import("@/lib/actions/ai-generate");
            const imageUrl = await generateImageWithGemini(prompt);

            const newImages = [...formData.images];
            newImages[index] = imageUrl;
            setFormData((prev: any) => ({ ...prev, images: newImages }));
        } catch (e: any) {
            console.error("Image Generation Error:", e);
            showMsg("Generation Failed", e.message || "Could not generate image with Gemini.", "error");
        } finally {
            const resetLoading = [...imageLoading];
            resetLoading[index] = false;
            setImageLoading(resetLoading);
        }
    };

    const handleAiGenerate = async () => {
        const title = formData[`title${lang === "en" ? "_en" : ""}`] ||
            formData[`title${lang === "en" ? "" : "_en"}`] ||
            formData.menu_label;

        if (!title) return showMsg("Missing Info", "Please enter a title or menu label first.", "error");

        setGenerating(true);

        try {
            const { generateContentWithAI } = await import("@/lib/actions/ai-generate");
            let data = await generateContentWithAI(title, formData.slug || "", lang);
            // ... (rest of the logic remains similar but uses imagePrompts)

            if (Array.isArray(data)) {
                data = data[0];
            }

            if (!data || typeof data !== "object") {
                throw new Error("AI returned invalid data format.");
            }

            const suffix = lang === "en" ? "_en" : "";
            const updates: any = {};

            if (data.slug && !formData.slug) updates.slug = data.slug;
            if (data.title) updates[`title${suffix}`] = data.title;
            if (data.meta_description) updates[`meta_description${suffix}`] = data.meta_description;
            if (data.h1_title) updates[`h1_title${suffix}`] = data.h1_title;
            if (data.intro_text) updates[`intro_text${suffix}`] = data.intro_text;
            if (data.cta_text) updates[`cta_text${suffix}`] = data.cta_text;
            if (data.cta_link) updates[`cta_link${suffix}`] = data.cta_link;

            if (data.body_content) {
                updates[`body_content${suffix}`] = typeof data.body_content === "string"
                    ? data.body_content
                    : JSON.stringify(data.body_content, null, 2);
            }

            // Populate prompts but don't generate images yet
            if (data.image_prompts && Array.isArray(data.image_prompts)) {
                const finalPrompts = [...data.image_prompts];
                while (finalPrompts.length < 3) finalPrompts.push("");
                updates.imagePrompts = finalPrompts;
                // Also reset images to ensure they match the new prompts
                updates.images = ["", "", ""];
            }

            setFormData((prev: any) => ({ ...prev, ...updates }));
            showMsg("AI Generation Complete", `Content and suggested prompts for ${lang === "en" ? "ENGLISH" : "BAHASA MELAYU"} have been drafted. Review the prompts in the Visual Assets section.`);
        } catch (e: any) {
            console.error("AI Generation Error:", e);
            showMsg("AI Error", e.message, "error");
        } finally {
            setGenerating(false);
        }
    };

    // --- Validation Logic ---
    const requiredFields = [
        "slug", "menu_label", "category",
        "title", "meta_description", "h1_title", "intro_text", "cta_text", "cta_link", "body_content",
        "title_en", "meta_description_en", "h1_title_en", "intro_text_en", "cta_text_en", "cta_link_en", "body_content_en"
    ];

    const getMissingFields = () => {
        return requiredFields.filter(field => {
            const val = formData[field];
            if (val === null || val === undefined || val === "") return true;
            if (field.startsWith("body_content")) {
                try {
                    const parsed = typeof val === "string" ? JSON.parse(val) : val;
                    return !parsed || (Array.isArray(parsed) && parsed.length === 0);
                } catch {
                    return true;
                }
            }
            return false;
        });
    };

    const missingFields = getMissingFields();
    const isFormComplete = missingFields.length === 0;

    async function handleDelete() {
        if (!initialData?.id && !initialData?.slug) return;
        if (!confirm("Are you sure you want to delete this page? It will be marked as deleted and hidden from the site.")) return;

        setIsDeleting(true);
        try {
            await deleteLandingPage(initialData.id, initialData.slug);
        } catch (e: any) {
            if (e.message !== "NEXT_REDIRECT") {
                showMsg("Delete Failed", e.message, "error");
                setIsDeleting(false);
            }
        }
    }

    async function onSubmit(fData: FormData) {
        if (!canEdit) return;
        if (!isFormComplete) {
            return showMsg("Incomplete Form", `Please fill in all fields before saving. Missing: ${missingFields.join(", ")}`, "error");
        }
        setLoading(true);

        const finalData = new FormData();
        Object.entries(formData).forEach(([key, val]) => {
            if (val !== null && val !== undefined) {
                if (key.startsWith('body_content') || key === 'images' || key === 'imagePrompts') {
                    const dbKey = key === 'imagePrompts' ? 'image_prompts' : key;
                    finalData.append(dbKey, typeof val === 'string' ? val : JSON.stringify(val));
                } else {
                    finalData.append(key, String(val));
                }
            }
        });
        finalData.append("isNew", String(!!isNew));

        try {
            await upsertLandingPage(finalData);
        } catch (e: any) {
            if (e.message !== "NEXT_REDIRECT") {
                showMsg("Save Failed", e.message, "error");
                setLoading(false);
            }
        }
    }

    const inputClass =
        "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10 disabled:opacity-60 disabled:cursor-not-allowed";
    const textareaClass =
        "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed";
    const labelClass =
        "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block";

    const sfx = lang === "en" ? "_en" : "";

    return (
        <form action={onSubmit} className="space-y-6 md:space-y-8 max-w-5xl relative">
            {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                    You are in View Only mode. Only Superadmins can edit this page.
                </div>
            )}

            {/* --- Top Metadata Card --- */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-black text-gray-900 text-lg">
                        Page Configuration
                    </h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border transition-all ${showPreview ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-600"}`}
                        >
                            {showPreview ? "Hide Preview" : "Show Preview"}
                        </button>
                        {isSuperadmin && (
                            <button
                                type="button"
                                disabled={generating}
                                onClick={handleAiGenerate}
                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {generating ? "Generating..." : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                        Auto-Fill Content & Images
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className={labelClass}>
                            Slug (URL)
                            {!formData.slug && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        <input
                            name="slug"
                            required
                            value={formData.slug || ""}
                            onChange={handleChange}
                            readOnly={!canEdit}
                            disabled={!canEdit}
                            className={inputClass}
                            placeholder="e.g. sewa-kereta-seremban"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Status</label>
                        <select
                            name="status"
                            value={formData.status || "active"}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={!canEdit}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>
                            Menu Label
                            {!formData.menu_label && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        <input
                            name="menu_label"
                            required
                            value={formData.menu_label || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="e.g. Seremban"
                            readOnly={!canEdit}
                            disabled={!canEdit}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            Category
                            {!formData.category && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        <select
                            name="category"
                            required
                            value={formData.category || "location"}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={!canEdit}
                        >
                            <option value="">Select Category...</option>
                            <option value="location">Location</option>
                            <option value="make">Car Make</option>
                            <option value="model">Car Model</option>
                            <option value="type">Car Type</option>
                            <option value="service">Service</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- Images Management Section --- */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-black text-gray-900 text-lg">
                        Visual Assets (Max 3)
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Prompt-to-Image Workflow
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-4">
                            <div className="aspect-[16/9] bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 relative group transition-all hover:border-indigo-300 shadow-inner">
                                {formData.images[idx] ? (
                                    <>
                                        <img
                                            src={formData.images[idx]}
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleImageChange(idx, "")}
                                                className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 transition-transform group-hover:scale-110"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Empty Slot {idx + 1}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">AI Generation Prompt</label>
                                <textarea
                                    value={formData.imagePrompts[idx] || ""}
                                    onChange={(e) => handlePromptChange(idx, e.target.value)}
                                    placeholder="e.g. Proton Saga parked at KLIA, professional lighting..."
                                    disabled={!canEdit}
                                    className={`${textareaClass} text-xs min-h-[60px] leading-tight`}
                                    rows={3}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleGenerateImage(idx)}
                                    disabled={!formData.imagePrompts[idx] || !canEdit || imageLoading[idx]}
                                    className="w-full py-1.5 px-3 bg-gray-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {imageLoading[idx] ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                            {formData.images[idx] ? "Regenerate Image" : "Generate Image"}
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Direct Image URL</label>
                                <input
                                    value={formData.images[idx] || ""}
                                    onChange={(e) => handleImageChange(idx, e.target.value)}
                                    placeholder="Paste URL if not using AI..."
                                    disabled={!canEdit}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- LIVE PREVIEW PANEL --- */}
            {showPreview && (
                <div className="bg-slate-900 rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                        </div>
                        <div className="bg-slate-700 rounded-md px-4 py-1 text-[10px] text-slate-300 font-mono">
                            jrvservices.com/{formData.slug || "..."}
                        </div>
                        <div className="w-8" />
                    </div>
                    <div className="bg-white min-h-[500px] overflow-y-auto font-sans">
                        {/* Fake Frontend Header */}
                        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#f15828] rounded flex items-center justify-center text-white font-bold text-xs italic">JRV</div>
                                <div className="font-black text-xs text-[#02071b] tracking-tighter">SERVICES</div>
                            </div>
                            <nav className="hidden md:flex gap-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Home</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Our Fleet</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</span>
                            </nav>
                        </header>

                        {/* Main Banner Mockup */}
                        <section className="bg-[#02071b] py-16 px-6 text-center border-b-[6px] border-[#f15828] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f15828]/5 rounded-full blur-3xl -mr-32 -mt-32" />
                            <div className="relative max-w-4xl mx-auto">
                                <h1 className="text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
                                    <span>JRV Car Rental Services </span>
                                    <span className="text-[#f15828]">{formData.menu_label || "Rembau"}.</span>
                                </h1>
                            </div>
                        </section>

                        <div className="max-w-4xl mx-auto px-6 py-10">
                            {/* Simple Language Switcher */}
                            <div className="flex justify-end gap-2 mb-8 text-[10px] font-bold">
                                <span className={lang !== "en" ? "text-red-500 underline" : "text-[#f15828]"}>BM</span>
                                <span className="text-gray-300"> | </span>
                                <span className={lang === "en" ? "text-red-500 underline" : "text-[#f15828]"}>EN</span>
                            </div>

                            {/* Hero Gallery Mockup - Adaptive Layout */}
                            {(() => {
                                const validImages = formData.images.filter((img: string) => img);
                                if (validImages.length === 0) return null;

                                if (validImages.length === 1) {
                                    return (
                                        <div className="mb-16 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-100 aspect-[21/9]">
                                            <img src={validImages[0]} className="w-full h-full object-cover" alt="Hero 1" />
                                        </div>
                                    );
                                }

                                if (validImages.length === 2) {
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
                                            <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-gray-100 aspect-[4/3]">
                                                <img src={validImages[0]} className="w-full h-full object-cover" alt="Hero 1" />
                                            </div>
                                            <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-gray-100 aspect-[4/3]">
                                                <img src={validImages[1]} className="w-full h-full object-cover" alt="Hero 2" />
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
                                        <div className="md:row-span-2 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-100">
                                            <img src={validImages[0]} className="w-full h-full object-cover" alt="Hero 1" />
                                        </div>
                                        <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-gray-100 h-48 md:h-64">
                                            {validImages[1] ? (
                                                <img src={validImages[1]} className="w-full h-full object-cover" alt="Hero 2" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-gray-100 h-48 md:h-64">
                                            {validImages[2] ? (
                                                <img src={validImages[2]} className="w-full h-full object-cover" alt="Hero 3" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Page Header (H1 & Intro) */}
                            <div className="mb-12 text-left">
                                <h2
                                    className="text-3xl md:text-5xl font-black text-[#02071b] mb-4 leading-[1.1]"
                                    dangerouslySetInnerHTML={{ __html: formData[`h1_title${sfx}`] || "H1 Heading Here" }}
                                />
                                <p
                                    className="text-gray-600 text-lg leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: formData[`intro_text${sfx}`] || "Intro text goes here." }}
                                />
                            </div>

                            {/* Content Blocks Preview */}
                            <div className="space-y-4">
                                {(() => {
                                    try {
                                        const raw = formData[`body_content${sfx}`];
                                        if (!raw) return <div className="text-gray-400 italic text-sm py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">Add some body content to see more...</div>;

                                        const blocks = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                        if (!Array.isArray(blocks) || blocks.length === 0) return null;

                                        return blocks.map((block: any, i: number) => {
                                            // Handle various key names for content
                                            const content = block.content || block.text || "";

                                            switch (block.type) {
                                                case 'h2':
                                                case 'h3':
                                                case 'heading':
                                                    return (
                                                        <h3
                                                            key={i}
                                                            className="text-2xl md:text-3xl font-black text-[#02071b] mt-12 mb-6 pb-2 border-b-4 border-[#f15828] inline-block"
                                                            style={{ whiteSpace: 'pre-wrap' }}
                                                            dangerouslySetInnerHTML={{ __html: content }}
                                                        />
                                                    );
                                                case 'p':
                                                case 'text':
                                                    return (
                                                        <p
                                                            key={i}
                                                            className="text-gray-700 text-base md:text-lg leading-relaxed mb-6"
                                                            style={{ whiteSpace: 'pre-wrap' }}
                                                            dangerouslySetInnerHTML={{ __html: content }}
                                                        />
                                                    );
                                                case 'image':
                                                    return <img key={i} src={block.url} alt={block.alt_text} className="w-full rounded-2xl shadow-2xl my-10 border-4 border-white ring-1 ring-gray-100" />;
                                                case 'features':
                                                    return (
                                                        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
                                                            {block.items?.map((item: any, j: number) => {
                                                                const title = typeof item === 'string' ? item : (item.title || item.name || "Feature");
                                                                const description = typeof item === 'string' ? "" : (item.description || item.text || "");
                                                                return (
                                                                    <div key={j} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                                                        <div className="w-10 h-10 rounded-full bg-[#f15828]/10 flex items-center justify-center mb-4">
                                                                            <span className="text-[#f15828] font-bold text-lg">✓</span>
                                                                        </div>
                                                                        <h4 className="font-black text-[#02071b] text-base mb-2" dangerouslySetInnerHTML={{ __html: title }} />
                                                                        <p className="text-sm text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                case 'list':
                                                    return (
                                                        <ul key={i} className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                                                            {block.items?.map((li: any, j: number) => (
                                                                <li key={j} className="text-sm md:text-base" dangerouslySetInnerHTML={{ __html: li }} />
                                                            ))}
                                                        </ul>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        });
                                    } catch (e) {
                                        return <div className="p-4 bg-red-50 text-red-500 rounded-xl text-[10px] font-mono">Invalid JSON in Body Content</div>;
                                    }
                                })()}
                            </div>

                            {/* CTA Section */}
                            <div className="mt-16 pt-10 flex flex-col md:flex-row items-center justify-center gap-6 border-t border-gray-100">
                                <span className="bg-[#f15828] text-white px-10 py-4 rounded-xl font-black text-base shadow-xl shadow-[#f15828]/30 uppercase tracking-widest cursor-default transform hover:-translate-y-1 transition-all">
                                    {formData[`cta_text${sfx}`] || "CTA Button"}
                                </span>
                                <span className="border-2 border-[#02071b] text-[#02071b] px-10 py-4 rounded-xl font-black text-base uppercase tracking-widest cursor-default">
                                    Call Now
                                </span>
                            </div>
                        </div>

                        {/* Carousel Mockup Footer */}
                        <div className="mt-20 bg-gray-50 py-16 px-6 border-t border-gray-100">
                            <div className="max-w-4xl mx-auto space-y-10">
                                <h2 className="text-center font-black text-[#02071b] text-3xl">Relevant Cars</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(n => (
                                        <div key={n} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group">
                                            <div className="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                                                <div className="absolute top-2 left-2 bg-[#f15828] text-white text-[8px] font-bold px-2 py-1 rounded uppercase tracking-tighter">Available</div>
                                                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                                                    <div className="h-4 w-1/4 bg-indigo-50 rounded" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="h-3 bg-gray-50 rounded w-full" />
                                                    <div className="h-3 bg-gray-50 rounded w-2/3" />
                                                </div>
                                                <div className="pt-2 border-t flex justify-between items-center">
                                                    <div className="h-5 w-1/3 bg-[#f15828]/10 rounded" />
                                                    <div className="h-8 w-8 bg-gray-900 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center">
                                    <span className="inline-block border-2 border-[#02071b] px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#02071b]">View All Cars</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Content Tabs --- */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 border-b pb-4">
                    <h3 className="font-black text-gray-900 text-lg flex-1">Page Content</h3>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg self-start md:self-auto">
                        <button
                            type="button"
                            onClick={() => setLang("bm")}
                            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${lang === "bm" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Bahasa Melayu
                        </button>
                        <button
                            type="button"
                            onClick={() => setLang("en")}
                            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${lang === "en" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            English
                        </button>
                    </div>
                </div>

                <div className={lang === "bm" ? "block" : "hidden"}>
                    <ContentFields
                        langSuffix=""
                        data={formData}
                        handleChange={handleChange}
                        inputClass={inputClass}
                        textareaClass={textareaClass}
                        labelClass={labelClass}
                        readOnly={!canEdit}
                    />
                </div>
                <div className={lang === "en" ? "block" : "hidden"}>
                    <ContentFields
                        langSuffix="_en"
                        data={formData}
                        handleChange={handleChange}
                        inputClass={inputClass}
                        textareaClass={textareaClass}
                        labelClass={labelClass}
                        readOnly={!canEdit}
                    />
                </div>
            </div>

            {/* STICKY FOOTER FOR ACTIONS */}
            {canEdit && (
                <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white border-t md:border-t-0 p-4 md:p-0 z-50 flex flex-col md:flex-row items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
                    {isSuperadmin && !isNew && (
                        <Link
                            href="/admin/landing-pages/logs"
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors mr-auto"
                        >
                            <ClipboardList size={14} />
                            Audit Logs
                        </Link>
                    )}
                    {!isFormComplete && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-tight">
                            Missing {missingFields.length} field{missingFields.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {!isNew && canEdit && (
                        <Button
                            type="button"
                            variant="danger"
                            disabled={isDeleting || loading}
                            onClick={handleDelete}
                            className="p-6 w-auto font-bold text-base md:text-sm flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} />
                            {isDeleting ? "Deleting..." : "Delete Page"}
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={loading || !isFormComplete}
                        className="p-6 w-auto font-bold shadow-lg shadow-indigo-200 text-base md:text-sm disabled:bg-gray-300 disabled:shadow-none"
                    >
                        {loading ? "Saving..." : "Save Page"}
                    </Button>
                </div>
            )}

            <Modal
                open={modal.open}
                title={modal.title}
                onClose={() => setModal(prev => ({ ...prev, open: false }))}
                footer={
                    <Button onClick={() => setModal(prev => ({ ...prev, open: false }))} variant={modal.type === "error" ? "danger" : "primary"}>
                        Understood
                    </Button>
                }
            >
                <div className="py-2">
                    <p className={`text-sm ${modal.type === "error" ? "text-red-600" : "text-gray-600"}`}>
                        {modal.message}
                    </p>
                </div>
            </Modal>
        </form>
    );
}

function ContentFields({ langSuffix, data, handleChange, inputClass, textareaClass, labelClass, readOnly }: any) {
    return (
        <div className="space-y-6">
            <div>
                <label className={labelClass}>
                    Page Title (SEO)
                    {!data[`title${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                    name={`title${langSuffix}`}
                    value={data[`title${langSuffix}`] || ""}
                    onChange={handleChange}
                    className={inputClass}
                    readOnly={readOnly}
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className={labelClass}>
                    Meta Description (SEO)
                    {!data[`meta_description${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                </label>
                <textarea
                    name={`meta_description${langSuffix}`}
                    value={data[`meta_description${langSuffix}`] || ""}
                    onChange={handleChange}
                    rows={2}
                    className={textareaClass}
                    readOnly={readOnly}
                    disabled={readOnly}
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>
                        H1 Heading
                        {!data[`h1_title${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <input
                        name={`h1_title${langSuffix}`}
                        value={data[`h1_title${langSuffix}`] || ""}
                        onChange={handleChange}
                        className={inputClass}
                        readOnly={readOnly}
                        disabled={readOnly}
                    />
                </div>
                <div>
                    <label className={labelClass}>
                        Intro Text
                        {!data[`intro_text${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <input
                        name={`intro_text${langSuffix}`}
                        value={data[`intro_text${langSuffix}`] || ""}
                        onChange={handleChange}
                        className={inputClass}
                        readOnly={readOnly}
                        disabled={readOnly}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>
                        CTA Text
                        {!data[`cta_text${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <input
                        name={`cta_text${langSuffix}`}
                        value={data[`cta_text${langSuffix}`] || ""}
                        onChange={handleChange}
                        className={inputClass}
                        readOnly={readOnly}
                        disabled={readOnly}
                    />
                </div>
                <div>
                    <label className={labelClass}>
                        CTA Link
                        {!data[`cta_link${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <input
                        name={`cta_link${langSuffix}`}
                        value={data[`cta_link${langSuffix}`] || ""}
                        onChange={handleChange}
                        className={inputClass}
                        readOnly={readOnly}
                        disabled={readOnly}
                    />
                </div>
            </div>

            <div>
                <label className={labelClass}>
                    Body Content (JSON)
                    {!data[`body_content${langSuffix}`] && <span className="ml-1 text-red-500">*</span>}
                </label>
                <p className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wide">
                    RAW JSON EDITOR
                </p>
                <textarea
                    name={`body_content${langSuffix}`}
                    value={typeof data[`body_content${langSuffix}`] === "string" ? data[`body_content${langSuffix}`] : JSON.stringify(data[`body_content${langSuffix}`] || [], null, 2)}
                    onChange={handleChange}
                    rows={15}
                    className={`${textareaClass} font-mono text-xs`}
                    readOnly={readOnly}
                    disabled={readOnly}
                />
            </div>
        </div>
    );
}
