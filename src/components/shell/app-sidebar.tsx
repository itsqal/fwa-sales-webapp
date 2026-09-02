"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateLongId } from "@/lib/format";
import type { AdminProfile } from "@/lib/api/types";
import { DASHBOARD_TITLE, NAV } from "./nav-config";
import { PackIcon } from "./icon";

export function AppSidebar({
  me,
  collapsed,
}: {
  me: AdminProfile;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const sections = NAV[me.role];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border-subtle bg-surface-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-sidebar",
      )}
    >
      <div className="flex flex-col items-center gap-2 border-b border-border-subtle px-6 py-6">
        <Image
          src={
            collapsed
              ? "/assets/brand/hifiair-mark-color.svg"
              : "/assets/brand/hifiair-lockup-color.svg"
          }
          alt="indosat HiFi Air"
          width={collapsed ? 44 : 118}
          height={collapsed ? 28 : 76}
          priority
        />
        {!collapsed && (
          <p className="text-sm text-text-secondary">
            {DASHBOARD_TITLE[me.role]}
          </p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`} className="mb-5">
            {section.title && !collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-text-secondary">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/mpx" && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-hifi-magenta font-medium text-white"
                          : "text-text-primary hover:bg-surface-muted",
                      )}
                    >
                      <PackIcon src={item.icon} />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-border-subtle px-6 py-5 text-text-muted">
        <CircleHelp className="size-5" />
        <CircleUser className="size-5" />
        {!collapsed && (
          <span className="ml-auto text-sm">
            {dateLongId(new Date().toISOString())}
          </span>
        )}
      </div>
    </aside>
  );
}
