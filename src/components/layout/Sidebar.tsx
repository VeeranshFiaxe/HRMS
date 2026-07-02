// src/components/layout/Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  Users,
  Building2,
  LogOut,
  ChevronRight,
  DollarSign,
  Shield,
  PartyPopper,
  BarChart3,
  UserCircle,
  Menu,
  X,
  Megaphone,
  Bell,
  CalendarDays,
  Wallet,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  href: string;     // parent link (also active-matches children)
  children: NavItem[];
}

// Employee-only navigation items
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Leave", href: "/dashboard/leave", icon: CalendarDays },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

// Admin My Space section
const adminSpaceItems: NavItem[] = [
  { label: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

// Admin flat items (non-grouped)
const adminTopItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Employees", href: "/admin/employees", icon: Users },
];

const adminBottomItems: NavItem[] = [
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Inbox", href: "/admin/inbox", icon: Bell },
  { label: "Office & IP", href: "/admin/office", icon: Building2 },
  { label: "Salary Rules", href: "/admin/salary", icon: DollarSign },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "Audit Logs", href: "/admin/audit", icon: Shield },
];

// Attendance group (expandable)
const attendanceGroup: NavGroup = {
  label: "Attendance",
  icon: BarChart3,
  href: "/admin/attendance",
  children: [
    { label: "Report", href: "/admin/attendance", icon: BarChart3 },
    { label: "Leave", href: "/admin/attendance/leave", icon: CalendarDays },
    { label: "Schedules", href: "/admin/schedules", icon: Clock },
    { label: "Holidays", href: "/admin/holidays", icon: PartyPopper },
  ],
};

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [isOpen, setIsOpen] = React.useState(false);

  // Keep attendance group open if any child is active
  const attendanceActive = attendanceGroup.children.some(c => pathname.startsWith(c.href));
  const [attendanceOpen, setAttendanceOpen] = React.useState(attendanceActive);

  // Also sync group open state when pathname changes
  React.useEffect(() => {
    if (attendanceActive) setAttendanceOpen(true);
  }, [attendanceActive]);

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  // Close sidebar on navigation in mobile
  React.useEffect(() => { setIsOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <p className="font-bold text-sm">CompanyHR</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-slate-300 hover:text-white">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-slate-900 text-white overflow-y-auto transition-all duration-300",
          "fixed md:sticky top-0 bottom-0 left-0 z-50 md:h-screen",
          isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60"
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

              {/* Top items (Overview, Employees) */}
              {adminTopItems.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
              ))}

              {/* Attendance group */}
              <div>
                <button
                  onClick={() => setAttendanceOpen(v => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                    attendanceActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                    collapsed && "justify-center"
                  )}
                >
                  <BarChart3 size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Attendance</span>
                      <ChevronDown size={14} className={cn("transition-transform", attendanceOpen && "rotate-180")} />
                    </>
                  )}
                </button>

                {/* Children */}
                {attendanceOpen && !collapsed && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {attendanceGroup.children.map(child => {
                      const Icon = child.icon;
                      // "Report" is exact match to /admin/attendance; others use startsWith
                      const childActive = child.href === "/admin/attendance"
                        ? pathname === "/admin/attendance"
                        : pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors",
                            childActive
                              ? "text-white bg-blue-500/30"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          )}
                        >
                          <Icon size={15} className="flex-shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom items */}
              {adminBottomItems.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
              ))}

              {/* My Space section */}
              <div className="pt-2 border-t border-slate-800 mt-2">
                <p className={cn("px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider", collapsed && "sr-only")}>
                  My Space
                </p>
                {adminSpaceItems.map((item) => (
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
    </>
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
