export const DASH_PERIODS = [7, 30, 90, 365] as const;
export type DashPeriod = (typeof DASH_PERIODS)[number];

export function parsePeriod(raw: string | undefined): DashPeriod {
  const n = Number(raw);
  return (DASH_PERIODS as readonly number[]).includes(n) ? (n as DashPeriod) : 30;
}

/** Bucket boundaries (UTC): daily up to 30 days, weekly for 90 days, calendar months for 12 months. The last bucket ends after today. */
export function buckets(days: DashPeriod, now = new Date()): { label: string; start: Date; end: Date }[] {
  const out: { label: string; start: Date; end: Date }[] = [];
  const day = 86_400_000;
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (days === 365) {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
      out.push({ label: start.toISOString().slice(0, 7), start, end });
    }
    return out;
  }
  const step = days === 90 ? 7 : 1;
  const count = Math.ceil(days / step);
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(todayStart + day - (i + 1) * step * day);
    out.push({ label: start.toISOString().slice(5, 10), start, end: new Date(start.getTime() + step * day) });
  }
  return out;
}
