"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modelImage } from "@/components/domain/device-model-picker";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { count, idr } from "@/lib/format";
import type { StockLine } from "@/lib/api/types";
import { useDeviceModels } from "@/features/reference/api/hooks";
import {
  useAccountExecutives,
  useAllocateStock,
  useStockSummary,
} from "../api/hooks";
import { AeSummaryPanel } from "./ae-summary-panel";
import { ManualBundlePicker } from "./manual-bundle-picker";

type Mode = "AUTO" | "MANUAL";

/**
 * *Alokasi Stok* — handing units to a salesman, and the moment the supply chain
 * becomes visible to the AE mobile app.
 *
 * Two ways to choose. *Otomatis* asks only for a quantity per model and lets the
 * server take the oldest received units, FIFO, under a row lock — two admins
 * allocating the last unit produce one success and one clean failure, never two
 * handovers of the same device. *Manual* names the units outright.
 *
 * Nothing is submitted until an AE is chosen; until then the panel says so and
 * the button stays grey.
 */
export function AllocateStockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const stock = useStockSummary();
  const models = useDeviceModels();
  const aes = useAccountExecutives({ page: 1, perPage: 100 }, open);

  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const allocate = useAllocateStock(idempotencyKey);

  const [aeId, setAeId] = useState<string | undefined>();
  const [mode, setMode] = useState<Mode>("AUTO");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState<string | null>(null);

  useResetWhenClosed(open, () => {
    setAeId(undefined);
    setMode("AUTO");
    setQuantities({});
    setSelections({});
    setError(null);
  });

  const lines = useMemo(
    () => (stock.data?.data ?? []).filter((line) => line.available > 0),
    [stock.data],
  );

  function priceFor(line: StockLine): number | null | undefined {
    return models.data?.data.find(
      (model) => model.deviceModelId === line.deviceModelId,
    )?.listPriceIdr;
  }

  function setQty(deviceModelId: string, value: number, max: number) {
    setQuantities((current) => ({
      ...current,
      [deviceModelId]: Math.max(0, Math.min(value, max)),
    }));
  }

  function toggle(deviceModelId: string, msisdn: string) {
    setSelections((current) => {
      const next = new Set(current[deviceModelId] ?? []);
      if (next.has(msisdn)) next.delete(msisdn);
      else next.add(msisdn);
      return { ...current, [deviceModelId]: next };
    });
  }

  function toggleMany(
    deviceModelId: string,
    msisdns: string[],
    checked: boolean,
  ) {
    setSelections((current) => {
      const next = new Set(current[deviceModelId] ?? []);
      for (const msisdn of msisdns) {
        if (checked) next.add(msisdn);
        else next.delete(msisdn);
      }
      return { ...current, [deviceModelId]: next };
    });
  }

  const autoTotal = Object.values(quantities).reduce(
    (sum, value) => sum + value,
    0,
  );
  const manualTotal = Object.values(selections).reduce(
    (sum, set) => sum + set.size,
    0,
  );
  const total = mode === "AUTO" ? autoTotal : manualTotal;

  async function submit() {
    if (!aeId) return;
    setError(null);
    try {
      const result = await allocate.mutateAsync(
        mode === "AUTO"
          ? {
              aeId,
              mode: "AUTO",
              items: Object.entries(quantities)
                .filter(([, qty]) => qty > 0)
                .map(([deviceModelId, qty]) => ({ deviceModelId, qty })),
            }
          : {
              aeId,
              mode: "MANUAL",
              msisdns: Object.values(selections).flatMap((set) => [...set]),
            },
      );
      toast.success(
        `${count(result.qty)} unit dialokasikan ke ${result.aeCode ?? "AE"}.`,
      );
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Alokasi tidak dapat disimpan.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-2xl">
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          Alokasi Stok
        </DialogTitle>
        <DialogDescription className="sr-only">
          Alokasikan stok modem kepada Account Executive.
        </DialogDescription>

        <div className="mt-6 space-y-2">
          <Label>Nama AE</Label>
          <Select
            value={aeId ?? ""}
            onValueChange={(value) => setAeId(value ?? undefined)}
          >
            <SelectTrigger className="h-12 w-full rounded-control px-4">
              <SelectValue placeholder="Pilih nama AE">
                {(value: string) =>
                  aes.data?.data.find((ae) => ae.aeId === value)?.fullName ??
                  "Pilih nama AE"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {aes.data?.data.map((ae) => (
                <SelectItem key={ae.aeId} value={ae.aeId}>
                  {ae.fullName} — {ae.aeCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <AeSummaryPanel aeId={aeId} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Label>Modem Tersedia</Label>
          <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
            <ModeTab active={mode === "AUTO"} onClick={() => setMode("AUTO")}>
              Otomatis
            </ModeTab>
            <ModeTab
              active={mode === "MANUAL"}
              onClick={() => setMode("MANUAL")}
            >
              Manual
            </ModeTab>
          </div>
        </div>

        {lines.length === 0 ? (
          <p className="mt-4 rounded-control bg-surface-muted px-4 py-8 text-center text-sm text-text-muted">
            Tidak ada stok yang tersedia untuk dialokasikan.
          </p>
        ) : mode === "AUTO" ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {lines.map((line) => {
                const qty = quantities[line.deviceModelId ?? ""] ?? 0;
                const active = qty > 0;
                return (
                  <div
                    key={line.deviceModelId}
                    className={cn(
                      "rounded-control border p-3",
                      active
                        ? "border-hifi-magenta bg-hifi-tint"
                        : "border-border-subtle bg-surface-card",
                    )}
                  >
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted">
                      <Image
                        src={modelImage({})}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 object-contain"
                      />
                    </span>
                    <p
                      className={cn(
                        "mt-2 text-sm leading-tight font-medium",
                        active ? "text-hifi-magenta" : "text-text-primary",
                      )}
                    >
                      {line.deviceModelCode}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {idr(priceFor(line))}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Stepper
                        label={`Kurangi ${line.deviceModelCode}`}
                        onClick={() =>
                          setQty(
                            line.deviceModelId ?? "",
                            qty - 1,
                            line.available,
                          )
                        }
                        disabled={qty <= 0}
                      >
                        <Minus className="size-4" />
                      </Stepper>
                      <span className="text-sm text-text-primary">{qty}</span>
                      <Stepper
                        label={`Tambah ${line.deviceModelCode}`}
                        onClick={() =>
                          setQty(
                            line.deviceModelId ?? "",
                            qty + 1,
                            line.available,
                          )
                        }
                        disabled={qty >= line.available}
                      >
                        <Plus className="size-4" />
                      </Stepper>
                    </div>
                    <p className="mt-2 rounded-full bg-surface-muted py-1 text-center text-xs text-text-secondary">
                      Stok {count(line.available)}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-text-muted italic">
              Apabila tidak memilih MSISDN, alokasi akan mengutamakan modem yang
              masuk stok lebih awal
            </p>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            {lines.map((line) => (
              <ManualBundlePicker
                key={line.deviceModelId}
                line={line}
                price={priceFor(line)}
                selected={selections[line.deviceModelId ?? ""] ?? EMPTY}
                onToggle={(msisdn) =>
                  toggle(line.deviceModelId ?? "", msisdn)
                }
                onToggleMany={(msisdns, checked) =>
                  toggleMany(line.deviceModelId ?? "", msisdns, checked)
                }
              />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={!aeId || total === 0 || allocate.isPending}
          className={cn(
            "mt-6 h-12 w-full rounded-full text-base",
            aeId && total > 0
              ? "bg-hifi-magenta hover:bg-hifi-cta"
              : "bg-hifi-charcoal text-white",
          )}
        >
          {allocate.isPending && <Loader2 className="size-4 animate-spin" />}
          Alokasikan{total > 0 ? ` ${count(total)} unit` : ""}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY: Set<string> = new Set();

function ModeTab({
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
        "rounded-full px-4 py-1.5 text-sm transition-colors",
        active
          ? "bg-hifi-cta text-white"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-7 items-center justify-center rounded-full bg-hifi-magenta text-white transition-colors hover:bg-hifi-cta disabled:bg-border-strong"
    >
      {children}
    </button>
  );
}
