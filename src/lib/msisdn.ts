/**
 * MSISDNs are normalised to `62` form before they leave the browser — a pasted
 * or imported `08…` number becomes `62…` in the request layer. The server
 * normalises again, but doing it here means the preview the operator confirms
 * is the value that will actually be stored.
 *
 * Display is always whatever the server returned; nothing here reformats it.
 */
export function normaliseMsisdn(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Matches the `^62[0-9]{8,13}$` CHECK the database applies. */
export function isValidMsisdn(value: string): boolean {
  return /^62[0-9]{8,13}$/.test(value);
}

/** An IMEI is 14–16 digits and carries no country code. */
export function isValidImei(value: string): boolean {
  return /^[0-9]{14,16}$/.test(value.trim());
}

export function normaliseImei(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}
