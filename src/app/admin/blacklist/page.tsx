import { Suspense } from "react";
import BlackListCheck from "./_components/BlackListCheck";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blacklisted Customers",
  description: "Manage blacklisted users.",
  path: "/admin/blacklist",
  index: false,
});

export default function BlacklistPage() {
  return (
    // ✅ FIX: Wrapped in Suspense to handle searchParams during build
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading blacklists...
        </div>
      }
    >
      <BlackListCheck />
    </Suspense>
  );
}
