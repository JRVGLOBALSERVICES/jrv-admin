import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">JRV Admin</div>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/agreements">Agreements</Link>
            <Link href="/admin/cars">Cars</Link>
            <Link href="/admin/catalog">Catalog</Link>
          </nav>
          <form action="/admin/logout" method="post">
            <button className="text-sm underline">Logout</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
