"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { truncateMiddle } from "@/lib/format";

/**
 * PO codes are long. Tables truncate them in the middle — the tail carries the
 * sequence number, which is what tells two same-day codes apart — and detail
 * views show them in full with the copy button the mockups put beside every one.
 */
export function CopyableCode({
  code,
  truncate,
  className,
}: {
  code: string;
  truncate?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission refused; the code is on screen either way.
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span title={code}>{truncate ? truncateMiddle(code, truncate) : code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Salin ${code}`}
        className="text-text-muted transition-colors hover:text-hifi-magenta"
      >
        {copied ? (
          <Check className="size-4 text-status-diterima" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </span>
  );
}
