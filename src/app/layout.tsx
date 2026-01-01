import type { Metadata, Viewport } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";
import GlobalShareButton from "../components/ui/GlobalShareButton";
// ✅ Import the new refresh button
import FloatingRefresh from "../components/ui/FloatingRefresh";

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Makes the content go under the status bar (full screen feel)
    title: "JRV Admin",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF3057", // Matches your brand pink
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming issues on inputs
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}

        {/* ✅ Existing Share Button */}
        <GlobalShareButton />

        {/* ✅ New iOS Hard Refresh Button */}
        <FloatingRefresh />
      </body>
    </html>
  );
}
