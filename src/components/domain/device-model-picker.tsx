"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import type { DeviceModelRef } from "@/lib/api/types";

/**
 * The device card grid on the MPX *Buat PO* form.
 *
 * Models and prices come from `/admin/reference/device-models`, not from the
 * mockup — the mockup priced every card at Rp 800.000 while its own PO list
 * showed three different prices, and the catalogue was since reconciled against
 * the one the AE app already ships.
 *
 * A model with no confirmed price cannot be ordered: the API refuses it with
 * `MODEL_NOT_PRICED`, so it is shown disabled rather than offered at a guess.
 */
export function DeviceModelPicker({
  models,
  value,
  onChange,
}: {
  models: DeviceModelRef[];
  value: string | undefined;
  onChange: (deviceModelId: string) => void;
}) {
  if (models.length === 0) {
    return (
      <p className="rounded-control bg-surface-muted px-4 py-6 text-center text-sm text-text-muted">
        Belum ada tipe modem yang tersedia.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {models.map((model) => {
        const selected = model.deviceModelId === value;
        const orderable = model.listPriceIdr !== null && model.isActive;
        return (
          <button
            key={model.deviceModelId}
            type="button"
            disabled={!orderable}
            aria-pressed={selected}
            onClick={() => onChange(model.deviceModelId)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-control border p-3 text-left transition-colors",
              selected
                ? "border-hifi-magenta bg-hifi-tint"
                : "border-border-subtle bg-surface-card hover:border-border-strong",
              !orderable && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="flex size-14 items-center justify-center self-center rounded-full bg-surface-muted">
              <Image
                src={modelImage(model)}
                alt=""
                width={40}
                height={40}
                className="size-10 object-contain"
              />
            </span>
            <span
              className={cn(
                "text-sm leading-tight font-medium",
                selected ? "text-hifi-magenta" : "text-text-primary",
              )}
            >
              {model.modelCode}
            </span>
            <span
              className={cn(
                "text-xs",
                selected ? "text-hifi-magenta" : "text-text-secondary",
              )}
            >
              {model.listPriceIdr === null
                ? "Harga belum ditetapkan"
                : idr(model.listPriceIdr)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The catalogue carries no `imageUrl` yet and the real product renders have not
 * been supplied, so everything falls back to the neutral line drawing in the
 * asset pack.
 */
export function modelImage(model: {
  imageUrl?: string;
  modelCode?: string;
}): string {
  if (model.imageUrl) return model.imageUrl;
  return "/assets/products/_generic-cpe.svg";
}
