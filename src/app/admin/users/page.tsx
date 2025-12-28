import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import UsersClient from "./UsersClient";

export const metadata: Metadata = pageMetadata({
  title: "Admin Users",
  description: "Manage admin and superadmin users for JRV Car Rental.",
  path: "/admin/users",
  index: false, // ✅ admin pages must not be indexed
});

export default function AdminUsersPage() {
  return <UsersClient />;
}
