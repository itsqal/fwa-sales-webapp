"use client";

import { useState } from "react";
import type { AdminProfile } from "@/lib/api/types";
import { SessionProvider } from "./session-context";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

/**
 * The frame every dashboard screen sits in: a fixed 272px sidebar, a topbar,
 * and the page on `--color-surface-page`.
 */
export function AppShell({
  me,
  children,
}: {
  me: AdminProfile;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SessionProvider me={me}>
      <div className="flex min-h-screen bg-surface-page">
        <AppSidebar me={me} collapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            me={me}
            onToggleSidebar={() => setCollapsed((value) => !value)}
          />
          <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
