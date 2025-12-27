"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useRole } from "@/lib/auth/useRole";

function Icon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

type Item = { href: string; label: string; icon: React.ReactNode };

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: Item;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active ? "bg-black text-white" : "text-black hover:bg-black/5 active:bg-black/10",
        collapsed ? "justify-center px-2" : "",
      ].join(" ")}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function Group({
  title,
  items,
  collapsed,
  defaultOpen = true,
  onNavigate,
}: {
  title: string;
  items: Item[];
  collapsed: boolean;
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (collapsed) setOpen(true);
  }, [collapsed]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => !collapsed && setOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs uppercase tracking-wide",
          "text-black/60 hover:bg-black/5",
          collapsed ? "justify-center px-2" : "",
        ].join(" ")}
        title={collapsed ? title : undefined}
      >
        {!collapsed ? (
          <>
            <span>{title}</span>
            <span className="text-base leading-none">{open ? "–" : "+"}</span>
          </>
        ) : (
          <span className="text-[10px]">•</span>
        )}
      </button>

      {open && (
        <div className="space-y-1">
          {items.map((it) => (
            <NavItem key={it.href} item={it} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { role, loading } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const mainItems: Item[] = useMemo(
    () => [
      { href: "/admin", label: "Dashboard", icon: <Icon d="M3 10.5h6V21H3V10.5Zm12 0h6V21h-6V10.5ZM3 3h6v6H3V3Zm12 0h6v6h-6V3Z" /> },
      { href: "/admin/agreements", label: "Agreements", icon: <Icon d="M8 7h8m-8 4h8m-8 4h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /> },
      { href: "/admin/cars", label: "Cars", icon: <Icon d="M7 17h10M6 16l1-5h10l1 5M7 11l1.2-3h7.6L17 11M7 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" /> },
      { href: "/admin/catalog", label: "Catalog", icon: <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
    ],
    []
  );

  const superItems: Item[] = useMemo(
    () => [
      { href: "/admin/users", label: "Admin Users", icon: <Icon d="M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" /> },
      { href: "/admin/audit", label: "Audit Logs", icon: <Icon d="M9 12h6m-6 4h6M8 3h8a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" /> },
    ],
    []
  );

  const widthClass = collapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border px-3 py-2 text-sm active:scale-[0.98]"
        >
          ☰
        </button>

        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.png" alt="JRV" width={32} height={32} priority />
          <span className="font-semibold">JRV Admin</span>
        </Link>

        <div className="w-[44px]" />
      </div>

      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 border-r bg-white transition-transform md:translate-x-0",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
            <Link href="/admin" className={["flex items-center gap-2", collapsed ? "justify-center w-full" : ""].join(" ")}>
              <Image src="/logo.png" alt="JRV" width={32} height={32} priority />
              {!collapsed && (
                <div className="min-w-0">
                  <div className="font-semibold leading-tight">JRV Admin</div>
                  <div className="text-[11px] opacity-60 capitalize">
                    {loading ? "…" : role ?? "no role"}
                  </div>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden md:inline-flex rounded-lg border px-2 py-1 text-xs hover:bg-black/5 active:bg-black/10"
              title={collapsed ? "Expand" : "Collapse"}
            >
              ⇔
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden rounded-lg border px-2 py-1 text-xs"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-3 px-2 py-4">
            <Group title="Main" items={mainItems} collapsed={collapsed} defaultOpen onNavigate={() => setMobileOpen(false)} />
            {role === "superadmin" && (
              <Group title="Superadmin" items={superItems} collapsed={collapsed} defaultOpen onNavigate={() => setMobileOpen(false)} />
            )}
          </nav>

          {/* Logout */}
          <form action="/admin/logout" method="post" className="border-t p-3">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className={collapsed ? "w-full justify-center px-0" : "w-full"}
              sound="on"
            >
              {collapsed ? "⎋" : "Logout"}
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
