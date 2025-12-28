import AgreementsClient from "./AgreementsClient";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Agreements",
  description:
    "Manage agreements, including booking details and car information.",
  path: "/admin/agreements",
  index: false, // ✅ admin pages should not be indexed
});
export default async function AgreementsPage() {
  return <AgreementsClient />;
}
