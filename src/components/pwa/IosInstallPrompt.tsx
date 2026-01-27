"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";

export default function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Detect if already in standalone mode (installed)
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

    // Show only if iOS and not installed
    if (isIOS && !isStandalone) {
      // Check if user dismissed it recently (optional, simple storage)
      const dismissed = localStorage.getItem("ios_pwa_dismissed");
      if (!dismissed) {
        setShow(true);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-100 p-4 pb-8 bg-white border-t border-gray-200 shadow-2xl animate-in slide-in-from-bottom duration-500">
      <div className="max-w-md mx-auto relative">
        <button
          onClick={() => {
            setShow(false);
            localStorage.setItem("ios_pwa_dismissed", "true");
          }}
          className="absolute -top-2 -right-2 p-1 bg-gray-100 rounded-full text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-4">
          <img
            src="/logo.png"
            alt="App Icon"
            className="w-14 h-14 rounded-xl shadow-md"
          />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900">Install App</h3>
            <p className="text-xs text-gray-500 mt-1">
              Install this app on your iPhone for a better experience.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs font-bold text-indigo-600">
              <span>1. Tap Share</span> <Share className="w-4 h-4" />
              <span>2. Add to Home Screen</span>{" "}
              <PlusSquare className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
