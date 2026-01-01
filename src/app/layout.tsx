import type { Metadata, Viewport } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // or 'default', 'black'
    title: "JRV Admin",
  },
};

// ✅ Fix: Viewport export is required for themeColor in Next.js 14+
export const viewport: Viewport = {
  themeColor: "#FF3057",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Optional: feels more native
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
