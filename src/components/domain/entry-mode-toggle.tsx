"use client";

import { cn } from "@/lib/utils";

export type EntryMode = "manual" | "import";

/** *Input Manual* / *Import Dokumen* — step 1 of every bulk wizard. */
export function EntryModeToggle({
  mode,
  onChange,
}: {
  mode: EntryMode;
  onChange: (mode: EntryMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ModeButton active={mode === "manual"} onClick={() => onChange("manual")}>
        Input Manual
      </ModeButton>
      <ModeButton active={mode === "import"} onClick={() => onChange("import")}>
        Import Dokumen
      </ModeButton>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-control border px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "border-hifi-magenta bg-hifi-magenta text-white"
          : "border-hifi-magenta bg-surface-card text-hifi-magenta hover:bg-hifi-tint",
      )}
    >
      {children}
    </button>
  );
}
