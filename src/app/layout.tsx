import type { Metadata } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json", // ✅ Link to PWA manifest
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
