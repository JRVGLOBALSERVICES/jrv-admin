import { Sidebar } from "@/components/ui/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="md:ml-64 ml-0 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
