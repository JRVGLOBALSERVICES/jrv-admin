import type { Metadata, Viewport } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";
// ✅ Import the button
import GlobalShareButton from "@/components/ui/GlobalShareButton";

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JRV Admin",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF3057",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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

        {/* ✅ Add it here, at the bottom */}
        <GlobalShareButton />
      </body>
    </html>
  );
}
