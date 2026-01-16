"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, Wrench, ChevronDown, ChevronRight, Facebook, Instagram, LayoutGrid, FileText, AlertTriangle, History } from "lucide-react";
import { Button } from "../../components/ui/Button";
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

// ✅ Added 'color' prop to Item type
type Item = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  children?: Item[];
};

function NavItem({
  item,
  collapsed,
  onNavigate,
  onExpand,
  depth = 0,
}: {
  item: Item;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  // Check if active (self or children)
  const isActive = useMemo(() => {
    if (item.href && pathname === item.href) return true;
    if (item.children) {
      return item.children.some((c) => c.href === pathname);
    }
    return false;
  }, [pathname, item]);

  // Auto-expand if child is active
  useEffect(() => {
    if (isActive && item.children) setExpanded(true);
  }, [isActive, item.children]);

  // If Folder (has children)
  if (item.children) {
    return (
      <div className={`space-y-0.5 ${collapsed ? "relative group" : ""}`}>
        <button
          onClick={() => {
            if (collapsed) {
              onExpand?.(); // Open sidebar
              setExpanded(true); // Expand folder
              return;
            }
            setExpanded(!expanded);
          }}
          className={[
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition font-medium select-none",
            isActive ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50",
            collapsed ? "justify-center px-2" : "justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className={`shrink-0 ${item.color}`}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </button>

        {/* Standard Expansion (Expanded Mode) */}
        {expanded && !collapsed && (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-0.5">
              {item.children.map((child) => (
                <NavItem
                  key={child.label}
                  item={child}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  onExpand={onExpand}
                  depth={depth + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Floating Submenu (Collapsed Mode) */}
        {collapsed && (
          <div className="absolute left-full top-0 ml-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 hidden group-hover:block animate-in fade-in slide-in-from-left-2">
            <div className="px-2 py-1.5 text-xs font-black uppercase text-gray-400 border-b border-gray-100 mb-1">
              {item.label}
            </div>
            <div className="space-y-0.5">
              {item.children.map((child) => (
                <NavItem
                  key={child.label}
                  item={child}
                  collapsed={false} // Force expand in popup
                  onNavigate={onNavigate}
                  // No onExpand needed in popup
                  depth={0} // Reset depth
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Leaf Item (Link)
  // Ensure we have href for leaf
  if (!item.href) return null;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition font-medium relative",
        depth > 0 ? "pl-9" : "", // Indent child items
        isActive
          ? "bg-black text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        collapsed ? "justify-center px-2" : "",
      ].join(" ")}
    >
      <span className={`shrink-0 ${isActive ? "text-white" : item.color}`}>
        {item.icon}
      </span>
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
  onExpand,
}: {
  title: string;
  items: Item[];
  collapsed: boolean;
  defaultOpen?: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
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
          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs uppercase tracking-wide font-bold",
          "text-gray-400 hover:bg-gray-50",
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
        <div className="space-y-0.5">
          {items.map((it, i) => (
            <NavItem
              key={(it.href ?? "nav") + i}
              item={it}
              collapsed={collapsed}
              onNavigate={onNavigate}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, onNavigate }: SidebarProps) {
  const { role, loading, email } = useRole();
  const pathname = usePathname();

  useEffect(() => {
    // Rely on parent's onNavigate for closing logic now
  }, [pathname]);

  const handleLogout = () => {
    // Clear dismissal state so popup resets for next login
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("urgent_dismissed");
    }
    window.location.href = "/admin/logout";
  };

  const handleExpand = () => setCollapsed(false);

  const mainItems: Item[] = useMemo(
    () => [
      // 1. DASHBOARD OVERVIEW
      {
        href: "/admin",
        label: "Dashboard",
        color: "text-indigo-600",
        icon: (
          <Icon d="M3 10.5h6V21H3V10.5Zm12 0h6V21h-6V10.5ZM3 3h6v6H3V3Zm12 0h6v6h-6V3Z" />
        ),
      },
      {
        href: "/admin/revenue",
        label: "Revenue",
        color: "text-emerald-600",
        icon: (
          <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        ),
      },

      // 2. AGREEMENTS GROUP
      {
        label: "Agreements",
        color: "text-blue-600",
        icon: (
          <Icon d="M8 7h8m-8 4h8m-8 4h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        ),
        children: [
          {
            href: "/admin/agreements",
            label: "All Agreements",
            color: "text-blue-600",
            icon: <FileText size={16} />
          },
          {
            href: "/admin/blacklist",
            label: "Blacklist",
            color: "text-red-500",
            icon: <AlertTriangle size={16} />
          },
        ]
      },

      // 3. CARS & FLEET
      {
        label: "Fleet Management",
        color: "text-rose-600",
        icon: (
          <Icon d="M7 17h10M6 16l1-5h10l1 5M7 11l1.2-3h7.6L17 11M7 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
        ),
        children: [
          {
            href: "/admin/cars",
            label: "All Vehicles",
            color: "text-rose-600",
            icon: <Icon d="M7 17h10M6 16l1-5h10l1 5M7 11l1.2-3h7.6L17 11M7 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
          },
          {
            href: "/admin/maintenance",
            label: "Maintenance",
            color: "text-amber-600",
            icon: <Wrench size={16} />,
          },
          {
            href: "/admin/insurance",
            label: "Insurance",
            color: "text-amber-500",
            icon: (
              <Icon d="M9 12h6m-6 4h6M8 3h8a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" />
            ),
          },
          {
            href: "/admin/catalog",
            label: "Car Catalog",
            color: "text-gray-600",
            icon: <LayoutGrid size={16} />,
          },
        ]
      },

      // 4. MARKETING
      {
        label: "Marketing Tools",
        color: "text-purple-600",
        icon: <Sparkles className="w-5 h-5" />,
        children: [
          {
            href: "/admin/marketing",
            label: "AI Studio",
            color: "text-purple-600",
            icon: <Sparkles size={16} />,
          },
          {
            href: "/admin/marketing/facebook",
            label: "Facebook Posts",
            color: "text-blue-600",
            icon: <Facebook size={16} />,
          },
          {
            href: "/admin/marketing/instagram",
            label: "Instagram Posts",
            color: "text-pink-600",
            icon: <Instagram size={16} />,
          },
          {
            href: "/admin/landing-pages",
            label: "Landing Pages",
            color: "text-cyan-600",
            icon: <LayoutGrid size={16} />,
          },
        ]
      },

      // 5. TRAFFIC
      {
        label: "Web Traffic",
        color: "text-violet-600",
        icon: (
          <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        ),
        children: [
          {
            href: "/admin/site-events",
            label: "Traffic Analytics",
            color: "text-violet-600",
            icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          }
        ]
      },
    ],
    []
  );

  const superItems: Item[] = useMemo(
    () => [
      {
        href: "/admin/users",
        label: "Admin Users",
        color: "text-cyan-600",
        icon: (
          <Icon d="M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" />
        ),
      },
      {
        href: "/admin/marketing-tracker",
        label: "Marketing Tracker",
        color: "text-orange-600",
        icon: (
          <Icon d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        ),
      },
      {
        href: "/admin/audit",
        label: "Admin Audit Logs",
        color: "text-slate-500",
        icon: (
          <Icon d="M9 12h6m-6 4h6M8 3h8a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" />
        ),
      },
      {
        href: "/admin/cars/logs",
        label: "Car Logs",
        color: "text-slate-400",
        icon: (
          <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        ),
      },
      {
        href: "/admin/agreements/logs",
        label: "Agreement Logs",
        color: "text-slate-400",
        icon: (
          <Icon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        ),
      },
      {
        href: "/admin/landing-pages/logs",
        label: "Landing Page Logs",
        color: "text-slate-400",
        icon: (
          <Icon d="M9 12h6m-6 4h6M8 3h8a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" />
        ),
      },
      {
        href: "/admin/notifications",
        label: "Slack Logs",
        color: "text-pink-600",
        icon: (
          <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        ),
      },
    ],
    []
  );

  const widthClass = collapsed ? "w-16" : "w-64";

  return (
    <>
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

          <nav className="flex-1 space-y-3 px-2 py-4 overflow-y-auto custom-scrollbar">
            <Group
              title="Main"
              items={mainItems}
              collapsed={collapsed}
              defaultOpen
              onNavigate={onNavigate}
              onExpand={handleExpand}
            />
            {role === "superadmin" && (
              <Group
                title="Superadmin"
                items={superItems}
                collapsed={collapsed}
                defaultOpen
                onNavigate={onNavigate}
                onExpand={handleExpand}
              />
            )}
          </nav>

          <div className="border-t p-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className={collapsed ? "w-full justify-center px-0" : "w-full"}
              sound="on"
            >
              {collapsed ? "⎋" : "Logout"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
