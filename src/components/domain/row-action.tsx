import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The square row buttons in every list: magenta for the primary action on a row,
 * gold for the secondary view/edit actions, matching the mockups.
 */
const TONES = {
  magenta: "bg-hifi-magenta text-white hover:bg-hifi-cta",
  gold: "bg-hifi-gold text-white hover:brightness-95",
} as const;

type Tone = keyof typeof TONES;

interface BaseProps {
  tone?: Tone;
  label: string;
  className?: string;
  children: React.ReactNode;
}

export function RowAction({
  tone = "magenta",
  label,
  className,
  children,
  ...props
}: BaseProps & Omit<React.ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(base, TONES[tone], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function RowActionLink({
  tone = "magenta",
  label,
  className,
  children,
  href,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(base, TONES[tone], className)}
    >
      {children}
    </Link>
  );
}

const base =
  "inline-flex size-9 items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-40";
