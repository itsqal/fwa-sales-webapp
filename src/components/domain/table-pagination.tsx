"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** "Tampilkan per 10 item" plus the numbered pages, exactly as mocked. */
export function TablePagination({
  page,
  perPage,
  totalPages,
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  perPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const total = Math.max(totalPages, 1);
  const pages = pageWindow(page, total);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-5">
      <Select
        value={String(perPage)}
        onValueChange={(value) => onPerPageChange(Number(value))}
      >
        <SelectTrigger className="h-11 rounded-control px-4">
          <SelectValue>
            {(value: string) => `Tampilkan per ${value} item`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PER_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              Tampilkan per {option} item
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <nav className="flex items-center gap-1" aria-label="Halaman">
        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-2 text-text-muted">
              &hellip;
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              aria-current={entry === page ? "page" : undefined}
              onClick={() => onPageChange(entry)}
              className={cn(
                "size-9 rounded-full text-sm transition-colors",
                entry === page
                  ? "bg-hifi-magenta font-medium text-white"
                  : "text-text-primary hover:bg-surface-muted",
              )}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page >= total}
          onClick={() => onPageChange(page + 1)}
          className="flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-5" />
        </button>
      </nav>
    </div>
  );
}

/** First pages, the current neighbourhood, and the last two. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, 2, 3, total - 1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push("gap");
    out.push(value);
    previous = value;
  }
  return out;
}
