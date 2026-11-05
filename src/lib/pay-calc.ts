/**
 * Pure pay computation (no database): the same function builds the monthly statements and is unit-tested.
 * Amounts are whole FCFA. Rules:
 *  - base = the base salary of the rank (pay scale);
 *  - BONUS and ALLOWANCE are paid on top of the base; FIXED = FCFA, PERCENT_OF_BASE = whole percent of the PAID base;
 *  - BENEFIT (benefit in kind) is valued and reported but is not cash: it is excluded from gross and net;
 *  - DEDUCTION is withheld; the total withheld can never exceed the gross (it is capped and flagged);
 *  - a suspended officer receives `suspendedPercent` % of the base and of FIXED bonuses/allowances; percentages follow the reduced base;
 *    fixed deductions keep their amount.
 */
export type PayItemKind = "BONUS" | "ALLOWANCE" | "BENEFIT" | "DEDUCTION";
export type PayItemInput = { code: string; name: string; kind: PayItemKind; calculation: "FIXED" | "PERCENT_OF_BASE"; value: number };
export type PayItem = { code: string; name: string; kind: PayItemKind; amount: number };
export type PayResult = { base: number; gross: number; deductions: number; net: number; benefits: number; items: PayItem[]; suspended: boolean; deductionsCapped: boolean };

export function computePay(input: { base: number; items: PayItemInput[]; suspended?: boolean; suspendedPercent?: number }): PayResult {
  const factor = input.suspended ? Math.min(100, Math.max(0, input.suspendedPercent ?? 100)) / 100 : 1;
  const base = Math.round(input.base * factor);
  const items: PayItem[] = [];
  let cash = 0;
  let withheld = 0;
  let benefits = 0;
  for (const i of input.items) {
    // A percentage applies to the base actually paid (already reduced for a suspended officer); only a FIXED bonus/allowance is scaled.
    const amount = i.calculation === "PERCENT_OF_BASE" ? Math.round((base * i.value) / 100) : i.kind === "BONUS" || i.kind === "ALLOWANCE" ? Math.round(i.value * factor) : i.value;
    items.push({ code: i.code, name: i.name, kind: i.kind, amount });
    if (i.kind === "BONUS" || i.kind === "ALLOWANCE") cash += amount;
    else if (i.kind === "DEDUCTION") withheld += amount;
    else benefits += amount;
  }
  const gross = base + cash;
  const deductions = Math.min(withheld, gross);
  return { base, gross, deductions, net: gross - deductions, benefits, items, suspended: !!input.suspended, deductionsCapped: withheld > gross };
}

export const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
/** First and last day (UTC) of a "YYYY-MM" period. */
export function periodBounds(period: string): { start: Date; end: Date } {
  const m = PERIOD_RE.exec(period);
  if (!m) throw new Error("invalid period");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return { start: new Date(Date.UTC(y, mo - 1, 1)), end: new Date(Date.UTC(y, mo, 0)) };
}
