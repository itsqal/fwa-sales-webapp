"use client";

import { useRouter } from "next/navigation";
import { LogOut, PanelLeft, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { organisationLabel } from "./nav-config";
import { FOCUS_SEARCH_EVENT } from "@/components/domain/search-filter-bar";
import type { AdminProfile } from "@/lib/api/types";

export function AppTopbar({
  me,
  onToggleSidebar,
}: {
  me: AdminProfile;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const org = organisationLabel(me.role, me.organisation);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-2 border-b border-border-subtle bg-surface-card px-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Sembunyikan menu"
      >
        <PanelLeft className="size-5 text-text-secondary" />
      </Button>

      {/* The mockups place a magnifier here with no global-search endpoint behind
        * it. Rather than a dead control, it puts the cursor in the page's own
        * search box. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cari"
        onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}
      >
        <Search className="size-5 text-text-secondary" />
      </Button>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-text-primary">{me.fullName}</p>
          {org && (
            <p className="text-xs text-text-secondary italic">{org}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Menu akun"
                className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            }
          >
            <Avatar className="size-10">
              <AvatarImage src="/assets/avatars/avatar-placeholder-80.png" alt="" />
              <AvatarFallback>{initials(me.fullName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
