import type { Metadata } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";
import IosInstallPrompt from "@/components/pwa/IosInstallPrompt"; // Import the component

export const metadata: Metadata = {
  ...baseMetadata(),
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <IosInstallPrompt /> {/* Add component here */}
      </body>
    </html>
  );
}
