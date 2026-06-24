// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  Users,
  Settings,
  Building2,
  FileText,
  LogOut,
  ChevronRight,
  DollarSign,
  MapPin,
  Shield,
  Wifi,
  PartyPopper,
  BarChart3,
  UserCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Attendance", href: "/admin/attendance", icon: BarChart3 },
  { label: "Schedules", href: "/admin/schedules", icon: Clock },
  { label: "Holidays", href: "/admin/holidays", icon: PartyPopper },
  { label: "Office & IP", href: "/admin/office", icon: Building2 },
  { label: "Salary Rules", href: "/admin/salary", icon: DollarSign },
  { label: "Audit Logs", href: "/admin/audit", icon: Shield },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white h-screen sticky top-0 overflow-y-auto transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 size={18} />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm">CompanyHR</p>
            <p className="text-slate-400 text-xs">
              {isAdmin ? "Admin Portal" : "Employee Portal"}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {/* Employee nav */}
        {!isAdmin && (
          <>
            <p className={cn("px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider", collapsed && "sr-only")}>
              My Space
            </p>
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </>
        )}

        {/* Admin nav */}
        {isAdmin && (
          <>
            <p className={cn("px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider", collapsed && "sr-only")}>
              Admin
            </p>
            {adminNavItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
            ))}

            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className={cn("px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider", collapsed && "sr-only")}>
                My Space
              </p>
              {navItems.map((item) => (
                <NavLink key={`emp-${item.href}`} item={item} active={isActive(item.href)} collapsed={collapsed} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-slate-800">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg mb-1", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors text-sm",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-blue-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800",
        collapsed && "justify-center"
      )}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}
