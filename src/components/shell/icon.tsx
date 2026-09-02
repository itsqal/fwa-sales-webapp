import { cn } from "@/lib/utils";

/**
 * Renders an icon from the asset pack.
 *
 * The pack's SVGs are drawn with `stroke="currentColor"`, which an `<img>` tag
 * cannot honour. Masking the shape and painting it with `bg-current` keeps the
 * purpose-drawn artwork *and* lets it take the colour of whatever it sits in —
 * an active nav item, a gold row action, a white button.
 */
export function PackIcon({
  src,
  className,
  ...props
}: { src: string } & React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 shrink-0 bg-current", className)}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
      {...props}
    />
  );
}
