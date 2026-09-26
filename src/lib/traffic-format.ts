/** Thousands grouped with a plain space (safe in PDF core fonts too): 25000 → "25 000". */
export function groupThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function fmtFcfa(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${groupThousands(n)} FCFA`;
}

/** The source table writes the class as « 3eme » — displayed « 3ème » (the stored text is never altered). */
export function fmtClassText(classText: string): string {
  return classText.replace(/^(\d)eme$/i, "$1ème");
}

export function licenceState(expiresAt: Date | string | null | undefined, now = new Date()): "none" | "expired" | "expiring" | "valid" {
  if (!expiresAt) return "none";
  const d = new Date(expiresAt);
  if (d < now) return "expired";
  return d.getTime() - now.getTime() < 60 * 86_400_000 ? "expiring" : "valid";
}
