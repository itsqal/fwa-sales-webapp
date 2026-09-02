"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { statusLabel } from "@/lib/status";

/** The topbar magnifier asks the page's search box to take focus. */
export const FOCUS_SEARCH_EVENT = "fwa:focus-search";

export interface SearchFilterBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * The funnel in the mockups opens a panel that was never drawn (issue #13),
   * and the list endpoints accept exactly one filter dimension — `status`. So
   * that is what it offers: anything more would be a control with no query
   * behind it.
   */
  statuses?: readonly string[];
  status?: string;
  onStatusChange?: (status: string | undefined) => void;
}

export function SearchFilterBar({
  placeholder,
  value,
  onChange,
  statuses,
  status,
  onStatusChange,
}: SearchFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // The list can reset its own query (a role switch, a cleared filter). Adopting
  // it during render keeps the box in step without a second pass.
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  // Debounced so a 20-page list is not re-queried on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
  }, []);

  return (
    <div className="flex h-12 w-full max-w-md items-center gap-2 rounded-full border border-border-subtle bg-surface-card pr-1 pl-5">
      <Search className="size-5 shrink-0 text-hifi-magenta" />
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
      />
      {statuses && onStatusChange && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Saring status"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  status
                    ? "bg-hifi-magenta text-white"
                    : "bg-text-muted text-white hover:bg-text-secondary",
                )}
              />
            }
          >
            <Filter className="size-4 fill-current" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={!status}
              onCheckedChange={() => onStatusChange(undefined)}
            >
              Semua status
            </DropdownMenuCheckboxItem>
            {statuses.map((value) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={status === value}
                onCheckedChange={() => onStatusChange(value)}
              >
                {statusLabel(value)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
