import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import NewCarClient from "./NewCarClient";

export const metadata: Metadata = pageMetadata({
  title: "Add New Car",
  description: "Create a new car listing in JRV Admin.",
  path: "/admin/cars/new",
  index: false,
});

export default function NewCarPage() {
  return <NewCarClient />;
}
