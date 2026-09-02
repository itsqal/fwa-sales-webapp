"use client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The two-step modal behind four of the flows in this app — supplying MSISDNs,
 * pairing IMEIs, attaching bundles to a device PO. The numbered stepper is
 * identical in every mockup, so it lives here rather than in each feature.
 */
export function WizardModal({
  open,
  onOpenChange,
  title,
  description,
  steps,
  current,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Two labels: *Input MSISDN* / *Submit MSISDN*, and so on. */
  steps: [string, string];
  /** 1-based. */
  current: 1 | 2;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] w-full gap-0 overflow-y-auto rounded-card p-8 sm:max-w-xl",
          className,
        )}
      >
        <DialogTitle className="font-display text-3xl font-semibold text-hifi-magenta">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="mt-1">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}

        <Stepper steps={steps} current={current} />

        <div className="mt-6">{children}</div>

        <div className="mt-6">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({
  steps,
  current,
}: {
  steps: [string, string];
  current: 1 | 2;
}) {
  return (
    <div className="mt-7 flex items-start justify-center gap-2">
      {steps.map((label, index) => {
        const step = (index + 1) as 1 | 2;
        const active = step === current;
        return (
          <div key={label} className="flex items-start gap-2">
            {index > 0 && (
              <span
                aria-hidden
                className="mt-6 w-16 border-t-2 border-dashed border-border-strong"
              />
            )}
            <div className="flex w-28 flex-col items-center gap-2">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border-2 border-hifi-magenta text-lg font-medium",
                  active
                    ? "bg-hifi-magenta text-white"
                    : "bg-surface-card text-hifi-magenta",
                )}
              >
                {step}
              </span>
              <span className="text-center text-sm text-text-primary">
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
