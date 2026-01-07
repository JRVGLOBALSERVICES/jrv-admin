import { redirect } from "next/navigation";

export default function PostsPage() {
  redirect("/admin/marketing?tab=posts");
}