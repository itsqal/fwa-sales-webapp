export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Search bar and the primary action, right-aligned. */
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-hifi-magenta">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-1 items-center justify-end gap-3">
          {children}
        </div>
      )}
    </header>
  );
}
