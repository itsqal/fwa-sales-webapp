"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/api/types";

/**
 * The IM3 / 3ID two-up selector.
 *
 * Which name to show is a per-context decision the contract makes possible:
 * `displayName` is the brand (*IM3*), `outletName` the storefront (*Gerai IM3*).
 * The mockups use both for the same brand in the same flow, so each caller says
 * which one it means rather than inheriting whichever screen was copied.
 */
export function BrandToggle({
  brands,
  value,
  onChange,
  variant = "outlet",
  disabled,
}: {
  brands: Brand[];
  value: string | undefined;
  onChange: (code: string) => void;
  variant?: "outlet" | "display";
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {brands.map((brand) => {
        const selected = brand.code === value;
        return (
          <button
            key={brand.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(brand.code)}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-3 rounded-control border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-hifi-magenta bg-hifi-tint"
                : "border-transparent bg-surface-muted hover:bg-surface-muted/70",
            )}
          >
            <Image
              src={brandLogo(brand.code)}
              alt=""
              width={36}
              height={24}
              className="h-6 w-9 object-contain"
            />
            <span
              className={cn(
                "text-sm",
                selected ? "text-hifi-magenta" : "text-text-secondary",
              )}
            >
              {variant === "outlet" ? brand.outletName : brand.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * IM3 and 3ID are registered trademarks and the real marks are not in the asset
 * pack — these are the correctly-sized placeholders, and every one is named
 * `*.PLACEHOLDER.*` so a grep before release finds them all.
 */
function brandLogo(code: string): string {
  const slug = code.toLowerCase() === "im3" ? "im3" : "3id";
  return `/assets/brand/${slug}-logo.PLACEHOLDER.svg`;
}
