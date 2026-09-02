"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_FILE_LABEL,
  ACCEPTED_FILE_TYPES,
  SpreadsheetError,
  parseSpreadsheet,
  type ParsedRow,
} from "@/lib/spreadsheet";

/**
 * The drop zone. It parses the file and hands the rows up; the caller then runs
 * them past the matching `:validate` endpoint before anything is committed.
 * Two calls, never one — the operator must see what will be written first.
 */
export function BulkImportPanel({
  onParsed,
  disabled,
  hint,
}: {
  onParsed: (rows: ParsedRow[], fileName: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const rows = await parseSpreadsheet(file);
      if (rows.length === 0) {
        setError("Tidak ada baris yang terbaca dari berkas ini.");
        return;
      }
      onParsed(rows, file.name);
    } catch (cause) {
      setError(
        cause instanceof SpreadsheetError
          ? cause.message
          : "Berkas tidak dapat dibaca.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) void handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "rounded-control border border-dashed px-6 py-9 text-center transition-colors",
          dragging
            ? "border-hifi-magenta bg-hifi-tint"
            : "border-border-strong bg-surface-card",
          disabled && "opacity-50",
        )}
      >
        <Upload className="mx-auto size-6 text-text-secondary" />
        <p className="mt-3 text-sm font-medium text-text-primary">
          Taruh dokumen disini atau{" "}
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="text-status-diproses underline-offset-2 hover:underline disabled:no-underline"
          >
            cari file
          </button>
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {hint ?? `Format yang didukung: ${ACCEPTED_FILE_LABEL}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      {busy && (
        <p className="mt-2 text-sm text-text-secondary">Membaca berkas…</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
