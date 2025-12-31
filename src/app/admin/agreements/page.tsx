import { Suspense } from "react";
import AgreementsClient from "./_components/AgreementsClient";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Agreements",
  description:
    "Manage agreements, including booking details and car information.",
  path: "/admin/agreements",
  index: false,
});

export default function AgreementsPage() {
  return (
    // ✅ FIX: Wrapped in Suspense to handle searchParams during build
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading agreements...
        </div>
      }
    >
      <AgreementsClient />
    </Suspense>
  );
}
