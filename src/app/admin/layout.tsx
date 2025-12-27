import { Sidebar } from "@/components/ui/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* content pushes right on md */}
      <main className="p-4 sm:p-6 md:pl-[17rem]">
        {children}
      </main>
    </div>
  );
}
