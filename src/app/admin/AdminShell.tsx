"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Initial Check for screen size
    useEffect(() => {
        setMounted(true);
        const checkSize = () => {
            // "Mid screens" logic: 
            // If width is >= 768 (md) AND < 1400 (covers 1366px laptops), default to collapsed
            if (window.innerWidth >= 768 && window.innerWidth < 1400) {
                setCollapsed(true);
            } else {
                setCollapsed(false);
            }
        };

        checkSize();
        // Optional: Add resize listener if you want dynamic resizing?
        // Usually only initial load is requested ("when page is loaded")
        // but handling resize handles orientation changes on tablets
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    // When selection is loaded (navigation), checking this via Sidebar callback is cleaner
    // We'll pass a "onNavigate" handler to Sidebar

    const handleNavigate = () => {
        setMobileOpen(false); // Always close mobile menu
        // Also close on mid-screens if we want "close when selection is loaded"
        if (window.innerWidth >= 768 && window.innerWidth < 1400) {
            setCollapsed(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                onNavigate={handleNavigate}
            />

            <main
                className={`transition-all duration-300 ease-in-out p-4 md:p-6 ${
                    // Mobile: ml-0
                    // Desktop: if collapsed ml-16, else ml-64
                    // We need 'md:' prefix effectively
                    "ml-0 " + (collapsed ? "md:ml-16" : "md:ml-64")
                    }`}
            >
                {children}
            </main>
        </div>
    );
}
