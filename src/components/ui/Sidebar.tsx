"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useRole } from "@/lib/auth/useRole";

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={d}
      />
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
        active
          ? "bg-black text-white"
          : "text-black hover:bg-black/5 active:bg-black/10",
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
            <NavItem
              key={it.href}
              item={it}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { role, loading, email } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainItems: Item[] = useMemo(
    () => [
      {
        href: "/admin",
        label: "Dashboard",
        icon: (
          <Icon d="M3 10.5h6V21H3V10.5Zm12 0h6V21h-6V10.5ZM3 3h6v6H3V3Zm12 0h6v6h-6V3Z" />
        ),
      },
      {
        href: "/admin/agreements",
        label: "Agreements",
        icon: (
          <Icon d="M8 7h8m-8 4h8m-8 4h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        ),
      },
      {
        href: "/admin/cars",
        label: "Cars",
        icon: (
          <Icon d="M7 17h10M6 16l1-5h10l1 5M7 11l1.2-3h7.6L17 11M7 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
        ),
      },
      {
        href: "/admin/catalog",
        label: "Catalog",
        icon: <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
      },
      // ✅ NEW: FB Posts & Videos (Clapperboard/Video Icon)
      {
        href: "/admin/posts",
        label: "FB Posts & Videos",
        icon: (
          <Icon d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        ),
      },
    ],
    []
  );

  const superItems: Item[] = useMemo(
    () => [
      {
        href: "/admin/users",
        label: "Admin Users",
        icon: (
          <Icon d="M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" />
        ),
      },
      // ✅ NEW: Marketing Tracker (Megaphone Icon)
      {
        href: "/admin/marketing-tracker",
        label: "Marketing Tracker",
        icon: (
          <Icon d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        ),
      },
      {
        href: "/admin/audit",
        label: "Audit Logs",
        icon: (
          <Icon d="M9 12h6m-6 4h6M8 3h8a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" />
        ),
      },
      {
        href: "/admin/cars/logs",
        label: "Car Logs",
        icon: (
          <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        ),
      },
      {
        href: "/admin/agreements/logs",
        label: "Agreement Logs",
        icon: (
          <Icon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        ),
      },
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

        <div className="w-11" />
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
            <Link
              href="/admin"
              className={[
                "flex items-center gap-2",
                collapsed ? "justify-center w-full" : "",
              ].join(" ")}
            >
              <Image
                src="/logo.png"
                alt="JRV"
                width={32}
                height={32}
                priority
              />
              {!collapsed && (
                <div className="min-w-0">
                  <div className="font-semibold leading-tight">JRV Admin</div>
                  <div className="text-[11px] opacity-60">
                    {loading ? "…" : email ?? "no email"}
                  </div>
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
            <Group
              title="Main"
              items={mainItems}
              collapsed={collapsed}
              defaultOpen
              onNavigate={() => setMobileOpen(false)}
            />
            {role === "superadmin" && (
              <Group
                title="Superadmin"
                items={superItems}
                collapsed={collapsed}
                defaultOpen
                onNavigate={() => setMobileOpen(false)}
              />
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
