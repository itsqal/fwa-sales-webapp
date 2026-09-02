"use client";

import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WizardModal } from "@/components/domain/wizard-modal";
import { BulkImportPanel } from "@/components/domain/bulk-import-panel";
import { ManualEntryPanel } from "@/components/domain/manual-entry-panel";
import {
  EntryModeToggle,
  type EntryMode,
} from "@/components/domain/entry-mode-toggle";
import { MsisdnImeiTable } from "@/components/domain/msisdn-imei-table";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { isValidMsisdn, normaliseMsisdn } from "@/lib/msisdn";
import { count } from "@/lib/format";
import type { DevicePo } from "@/lib/api/types";
import { useAttachBundles, useValidateBundles } from "../api/hooks";

/**
 * *Pairing Device & PO* — the Device Partner commits paired bundles to an MPX
 * order.
 *
 * Only the MSISDN is sent. The IMEI shown beside it comes back from the dry run
 * so the operator can recognise the unit, but the bundle is already whole on the
 * server and re-sending its IMEI would invite the two to disagree.
 *
 * The attached count must equal the order quantity exactly, and each unit must
 * be a paired, unattached bundle that reached this partner through its own
 * MSISDN PO — which is what stops a partner shipping a competitor's stock.
 */
export function DevicePoPairingWizard({
  po,
  open,
  onOpenChange,
}: {
  po: DevicePo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<EntryMode>("import");
  const [msisdns, setMsisdns] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const validate = useValidateBundles();
  const attach = useAttachBundles(idempotencyKey);

  const expected = po ? po.qty - po.qtyAttached : 0;

  useResetWhenClosed(open, () => {
    setStep(1);
    setMode("import");
    setMsisdns([]);
    setAccepted([]);
    setConfirmed(false);
    setError(null);
  });

  const rows = useMemo(
    () =>
      (step === 2 ? accepted : msisdns).map((msisdn) => ({
        brandCode: po?.brand?.displayName,
        msisdn,
      })),
    [step, accepted, msisdns, po],
  );

  function addMsisdn(raw: string): string | null {
    const msisdn = normaliseMsisdn(raw);
    if (!isValidMsisdn(msisdn)) {
      return "Nomor harus dalam format 62… atau 08… yang sah.";
    }
    if (msisdns.includes(msisdn)) return "Nomor ini sudah ada dalam daftar.";
    if (msisdns.length >= expected) {
      return `Jumlah unit tidak boleh melebihi ${count(expected)}.`;
    }
    setMsisdns((current) => [...current, msisdn]);
    return null;
  }

  async function goToReview() {
    if (!po) return;
    setError(null);
    try {
      const result = await validate.mutateAsync({
        id: po.devicePoId,
        msisdns,
      });
      if (!result.ok) {
        setError(
          result.errors?.[0]?.issue ??
            `Diharapkan ${count(result.expected)} unit, diterima ${count(result.received)}.`,
        );
        return;
      }
      setAccepted(result.accepted);
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
      const result = await attach.mutateAsync({
        id: po.devicePoId,
        msisdns: accepted,
      });
      toast.success(`${count(result.attached)} unit dipasang ke ${po.poCode}.`);
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Unit tidak dapat dipasang.",
      );
    }
  }

  return (
    <WizardModal
      open={open}
      onOpenChange={onOpenChange}
      title="Pairing Device & PO"
      steps={["Input ID", "Submit ID"]}
      current={step}
      footer={
        step === 1 ? (
          <Button
            onClick={goToReview}
            disabled={
              msisdns.length !== expected ||
              expected === 0 ||
              validate.isPending
            }
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {validate.isPending && <Loader2 className="size-4 animate-spin" />}
            Selanjutnya
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={!confirmed || attach.isPending}
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {attach.isPending && <Loader2 className="size-4 animate-spin" />}
            Kirim
          </Button>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-5">
          <EntryModeToggle mode={mode} onChange={setMode} />

          <p className="text-sm text-text-secondary">
            {`${count(msisdns.length)} dari ${count(expected)} unit sudah dipilih.`}
          </p>

          {mode === "import" ? (
            <BulkImportPanel
              onParsed={(parsed) => {
                const numbers = parsed
                  .map((row) => row.msisdn ?? "")
                  .filter((msisdn) => isValidMsisdn(msisdn));
                if (numbers.length === 0) {
                  setError("Tidak ada MSISDN yang valid pada berkas ini.");
                  return;
                }
                setError(null);
                setMsisdns([...new Set(numbers)].slice(0, expected));
              }}
            />
          ) : (
            <ManualEntryPanel
              label="Nomor MSISDN"
              placeholder="+62"
              onAdd={addMsisdn}
            />
          )}

          <div className="space-y-2">
            <MsisdnImeiTable
              variant="scroll"
              rows={rows}
              showImei={false}
              emptyMessage="Belum ada unit yang dipilih."
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
                Kode PO: <CopyableCode code={po.poCode} truncate={28} />
              </span>
              <span>Jumlah: {count(accepted.length)}</span>
            </div>
          )}

          <MsisdnImeiTable rows={rows} showImei={false} />

          <ConfirmationCheckbox
            fullName={me.fullName}
            statement="mengonfirmasi bahwa pairing PO ini sudah sesuai dan siap ditindaklanjuti"
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
