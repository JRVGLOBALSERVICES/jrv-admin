import type { Metadata, Viewport } from "next";
// ✅ Import the font
import { Inter } from "next/font/google";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";
import GlobalShareButton from "../components/ui/GlobalShareButton";
import FloatingRefresh from "../components/ui/FloatingRefresh";

// ✅ Configure the font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // We will use this variable in Tailwind
  display: "swap",
});

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JRV Admin",
    startupImage: "/logo2.png",
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
      {/* ✅ Apply the font class to the body */}
      <body className={`${inter.variable} font-sans bg-gray-50 min-h-screen`}>
        {children}
        <GlobalShareButton />
        <FloatingRefresh />
      </body>
    </html>
  );
}
