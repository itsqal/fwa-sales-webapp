"use client";

import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WizardModal } from "@/components/domain/wizard-modal";
import { ManualEntryPanel } from "@/components/domain/manual-entry-panel";
import { BulkImportPanel } from "@/components/domain/bulk-import-panel";
import { MsisdnImeiTable } from "@/components/domain/msisdn-imei-table";
import {
  EntryModeToggle,
  type EntryMode,
} from "@/components/domain/entry-mode-toggle";
import { ConfirmationCheckbox } from "@/components/domain/confirmation-checkbox";
import { CopyableCode } from "@/components/domain/copyable-code";
import { useSession } from "@/components/shell/session-context";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useResetWhenClosed } from "@/hooks/use-reset-when-closed";
import { ApiRequestError } from "@/lib/api/client";
import { isValidImei, normaliseImei, normaliseMsisdn } from "@/lib/msisdn";
import { count } from "@/lib/format";
import type { MsisdnPo, PairingRow } from "@/lib/api/types";
import {
  usePairBundles,
  usePairingWorklist,
  useValidatePairing,
} from "@/features/msisdn-po/api/hooks";

/**
 * *Pairing MSISDN & IMEI* — the Device Partner gives each supplied number an
 * IMEI, turning it into a bundle.
 *
 * The IMEI count must equal the unpaired MSISDN count exactly. A partial
 * pairing is rejected rather than applied: half a bundle is a unit nobody can
 * ship and nobody can find.
 */
export function PairingWizard({
  po,
  open,
  onOpenChange,
}: {
  po: MsisdnPo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<EntryMode>("manual");
  const [imeis, setImeis] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idempotencyKey, resetKey] = useIdempotencyKey();
  const worklist = usePairingWorklist(po?.msisdnPoId, open);
  const validate = useValidatePairing();
  const pair = usePairBundles(idempotencyKey);

  const unpaired = useMemo(
    () => (worklist.data?.data ?? []).filter((row) => !row.imei),
    [worklist.data],
  );

  useResetWhenClosed(open, () => {
    setStep(1);
    setMode("manual");
    setImeis([]);
    setConfirmed(false);
    setError(null);
  });

  /**
   * IMEIs are matched to numbers in worklist order — the same order the server
   * hands them back and the same order the review table shows, so what the
   * operator attests to is what gets written.
   */
  const pairs: PairingRow[] = useMemo(
    () =>
      imeis.map((imei, index) => ({
        msisdn: unpaired[index]?.msisdn ?? "",
        imei,
      })),
    [imeis, unpaired],
  );

  const complete = imeis.length === unpaired.length && unpaired.length > 0;

  function addImei(raw: string): string | null {
    const imei = normaliseImei(raw);
    if (!isValidImei(imei)) return "IMEI terdiri dari 14–16 digit angka.";
    if (imeis.includes(imei)) return "IMEI ini sudah ada dalam daftar.";
    if (imeis.length >= unpaired.length) {
      return `Jumlah IMEI tidak boleh melebihi ${count(unpaired.length)} MSISDN.`;
    }
    setImeis((current) => [...current, imei]);
    return null;
  }

  async function goToReview() {
    if (!po) return;
    setError(null);
    try {
      const result = await validate.mutateAsync({
        id: po.msisdnPoId,
        pairs,
      });
      if (!result.ok) {
        setError(
          result.errors?.[0]?.issue ??
            `Diharapkan ${count(result.expected)} IMEI, diterima ${count(result.received)}.`,
        );
        return;
      }
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
      const result = await pair.mutateAsync({ id: po.msisdnPoId, pairs });
      toast.success(`${count(result.paired)} unit berhasil dipasangkan.`);
      resetKey();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "Pairing tidak dapat disimpan.",
      );
    }
  }

  return (
    <WizardModal
      open={open}
      onOpenChange={onOpenChange}
      title="Pairing MSISDN & IMEI"
      steps={["Input IMEI", "Submit IMEI"]}
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
            disabled={!confirmed || pair.isPending}
            className="h-12 w-full rounded-full bg-hifi-magenta text-base hover:bg-hifi-cta"
          >
            {pair.isPending && <Loader2 className="size-4 animate-spin" />}
            Kirim
          </Button>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-5">
          <EntryModeToggle mode={mode} onChange={setMode} />

          <p className="text-sm text-text-secondary">
            {worklist.isLoading
              ? "Memuat nomor…"
              : `${count(imeis.length)} dari ${count(unpaired.length)} MSISDN sudah diberi IMEI.`}
          </p>

          {mode === "manual" ? (
            <ManualEntryPanel
              label="Nomor IMEI"
              /* The mockup carries "+62" here — copy-pasted from the MSISDN form.
               * An IMEI has no country code (issue #6). */
              placeholder="mis. 355806671396654"
              onAdd={addImei}
              disabled={worklist.isLoading || unpaired.length === 0}
            />
          ) : (
            <BulkImportPanel
              disabled={worklist.isLoading || unpaired.length === 0}
              onParsed={(rows) => {
                const parsed = rows
                  .map((row) => row.imei ?? "")
                  .filter((imei) => isValidImei(imei));
                if (parsed.length === 0) {
                  setError("Tidak ada IMEI yang valid pada berkas ini.");
                  return;
                }
                setError(null);
                setImeis(parsed.slice(0, unpaired.length));
              }}
            />
          )}

          <div className="space-y-2">
            <MsisdnImeiTable
              variant="scroll"
              rows={pairs.map((row) => ({
                brandCode: po?.brand?.displayName,
                msisdn: normaliseMsisdn(row.msisdn),
                imei: row.imei,
              }))}
              emptyMessage="Belum ada IMEI yang dimasukkan."
            />
            {imeis.length > 0 && (
              <button
                type="button"
                onClick={() => setImeis([])}
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
              <span>Jumlah: {count(pairs.length)}</span>
            </div>
          )}

          <MsisdnImeiTable
            rows={pairs.map((row) => ({
              brandCode: po?.brand?.displayName,
              msisdn: row.msisdn,
              imei: row.imei,
            }))}
          />

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

