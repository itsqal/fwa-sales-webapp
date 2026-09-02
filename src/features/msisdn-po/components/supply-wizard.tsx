"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WizardModal } from "@/components/domain/wizard-modal";
import { ManualEntryPanel } from "@/components/domain/manual-entry-panel";
import { BulkImportPanel } from "@/components/domain/bulk-import-panel";
import { MsisdnImeiTable } from "@/components/domain/msisdn-imei-table";
import {
  EntryModeToggle,
  type EntryMode,
} from "@/components/domain/entry-mode-toggle";
import { BrandToggle } from "@/components/domain/brand-toggle";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { isValidMsisdn, normaliseMsisdn } from "@/lib/msisdn";
import { count } from "@/lib/format";
import type { MsisdnPo } from "@/lib/api/types";
import { useBrands } from "@/features/reference/api/hooks";
import {
  useProcessMsisdnPo,
  useSupplyMsisdns,
  useValidateSupply,
} from "../api/hooks";

/**
 * *List MSISDN* — IOH hands the Device Partner the numbers it asked for.
 *
 * Opening this on an untouched request also moves it to `DIPROSES`: that state
 * means "IOH has picked it up", and picking it up is exactly what opening the
 * wizard is. Without it a request would jump from `DIAJUKAN` straight to
 * `DITERIMA` and the Device Partner would never see that anyone was working.
 */
export function SupplyWizard({
  po,
  open,
  onOpenChange,
}: {
  po: MsisdnPo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const brands = useBrands();

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<EntryMode>("manual");
  const [msisdns, setMsisdns] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const process = useProcessMsisdnPo();
  const validate = useValidateSupply();
  const supply = useSupplyMsisdns(idempotencyKey);

  const expected = po?.qtyRequested ?? 0;
  // The brand belongs to the request, so it is read from the PO rather than
  // held as form state — there is nothing here for the operator to change.
  const brandCode = po?.brand?.code;

  useResetWhenClosed(open, () => {
    setStep(1);
    setMode("manual");
    setMsisdns([]);
    setConfirmed(false);
    setError(null);
  });

  useEffect(() => {
    // Opening this on an untouched request is IOH picking it up.
    if (open && po && po.status === "DIAJUKAN") {
      process.mutate({ id: po.msisdnPoId });
    }
    // `process` is a stable mutation object; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po?.msisdnPoId, po?.status]);

  const complete = msisdns.length === expected && expected > 0;

  const rows = useMemo(
    () =>
      msisdns.map((msisdn) => ({
        brandCode: brandLabel(brandCode, po),
        msisdn,
      })),
    [msisdns, brandCode, po],
  );

  function addMsisdn(raw: string): string | null {
    const msisdn = normaliseMsisdn(raw);
    if (!isValidMsisdn(msisdn)) {
      return "Nomor harus dalam format 62… atau 08… yang sah.";
    }
    if (msisdns.includes(msisdn)) return "Nomor ini sudah ada dalam daftar.";
    if (msisdns.length >= expected) {
      return `Jumlah nomor tidak boleh melebihi ${count(expected)}.`;
    }
    setMsisdns((current) => [...current, msisdn]);
    return null;
  }

  async function goToReview() {
    if (!po) return;
    setError(null);
    try {
      const result = await validate.mutateAsync({
        id: po.msisdnPoId,
        msisdns,
      });
      if (!result.ok) {
        setError(
          result.errors?.[0]?.issue ??
            `Diharapkan ${count(result.expected)} nomor, diterima ${count(result.received)}.`,
        );
        return;
      }
      // The server normalises too; use what it accepted so the operator reviews
      // exactly the values that will be stored.
      setMsisdns(result.accepted);
      setStep(2);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Daftar tidak dapat diperiksa.",
      );
    }
  }

  async function submit() {
    if (!po) return;
    setError(null);
    try {
      const result = await supply.mutateAsync({ id: po.msisdnPoId, msisdns });
      toast.success(`${count(result.supplied)} nomor dikirim ke ${po.devicePartner?.name ?? "Device Partner"}.`);
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Nomor tidak dapat dikirim.",
      );
    }
  }

  return (
    <WizardModal
      open={open}
      onOpenChange={onOpenChange}
      title="List MSISDN"
      steps={["Input MSISDN", "Submit MSISDN"]}
      current={step}
      footer={
        step === 1 ? (
          <Button
            onClick={goToReview}
            disabled={!complete || validate.isPending}
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {validate.isPending && <Loader2 className="size-4 animate-spin" />}
            Selanjutnya
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={!confirmed || supply.isPending}
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {supply.isPending && <Loader2 className="size-4 animate-spin" />}
            Kirim
          </Button>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-5">
          <EntryModeToggle mode={mode} onChange={setMode} />

          <p className="text-sm text-text-secondary">
            {`${count(msisdns.length)} dari ${count(expected)} nomor sudah dimasukkan.`}
          </p>

          {mode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label>Brand</Label>
                <BrandToggle
                  brands={brands.data?.data ?? []}
                  value={brandCode}
                  onChange={() => undefined}
                  variant="outlet"
                  /* The brand belongs to the request, not to this batch — it is
                   * shown so the operator can see which brand they are supplying
                   * for, and is not part of the payload. */
                  disabled
                />
              </div>
              <ManualEntryPanel
                label="Nomor MSISDN"
                placeholder="+62"
                onAdd={addMsisdn}
              />
            </>
          ) : (
            <BulkImportPanel
              onParsed={(parsed) => {
                const numbers = parsed
                  .map((row) => row.msisdn ?? "")
                  .filter((msisdn) => isValidMsisdn(msisdn));
                if (numbers.length === 0) {
                  setError("Tidak ada nomor yang valid pada berkas ini.");
                  return;
                }
                setError(null);
                setMsisdns([...new Set(numbers)]);
              }}
            />
          )}

          <div className="space-y-2">
            <MsisdnImeiTable
              variant="scroll"
              rows={rows}
              showImei={false}
              emptyMessage="Belum ada nomor yang dimasukkan."
            />
            {msisdns.length > 0 && (
              <button
                type="button"
                onClick={() => setMsisdns([])}
                className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Kosongkan daftar
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {po && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
              <span>
                Kode PO: <CopyableCode code={po.poCode} />
              </span>
              <span>Jumlah: {count(msisdns.length)}</span>
            </div>
          )}

          <MsisdnImeiTable rows={rows} showImei={false} />

          <ConfirmationCheckbox
            fullName={me.fullName}
            statement="mengonfirmasi bahwa pesanan PO ini sudah sesuai dan siap ditindaklanjuti"
            checked={confirmed}
            onCheckedChange={setConfirmed}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </WizardModal>
  );
}

function brandLabel(
  brandCode: string | undefined,
  po: MsisdnPo | null,
): string | undefined {
  if (po?.brand && po.brand.code === brandCode) return po.brand.displayName;
  return brandCode;
}
