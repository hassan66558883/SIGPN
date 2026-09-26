/**
 * Dependency-free SVG/HTML charts for the traffic dashboard (server-renderable, no client JS).
 * Design rules (data-viz): one axis, thin marks with 4px rounded data-ends anchored to the baseline,
 * recessive grid, a legend for 2+ series (none for one), selective direct labels, colour never alone
 * (every mark has a native tooltip and the numbers are also available in a table view).
 * Colours are the validated categorical slots: blue = issued, aqua = collected, orange = outstanding.
 */
import type { ReactNode } from "react";

export const CHART = { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", grid: "#e3e8f0", axis: "#5b6675", ink: "#14202e" } as const;

export type Series = { name: string; color: string; points: { label: string; value: number }[] };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink" aria-label="legend">
      {items.map((i) => (
        <li key={i.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Column chart, 1 or 2 series grouped per label. Only the peak of each series is labelled. */
export function ColumnChart({ series, format, title, tableLabel }: { series: Series[]; format: (n: number) => string; title: string; tableLabel: string }) {
  const W = 480;
  const H = 210;
  const padL = 54;
  const padB = 26;
  const padT = 14;
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const plotH = H - padB - padT;
  const groupW = (W - padL - 8) / Math.max(1, labels.length);
  const barW = Math.min(18, (groupW - 6) / series.length - 2);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const step = Math.ceil(labels.length / 6);
  return (
    <figure>
      {series.length > 1 ? <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} /> : null}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full min-w-[340px]">
        <title>{title}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={11} fill={CHART.axis}>
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((label, i) => {
          const gx = padL + i * groupW + (groupW - series.length * (barW + 2)) / 2;
          return (
            <g key={label}>
              {series.map((s, si) => {
                const v = s.points[i].value;
                const h = Math.max(v > 0 ? 2 : 0, (v / max) * plotH);
                const x = gx + si * (barW + 2);
                const peak = v > 0 && v === Math.max(...s.points.map((p) => p.value));
                return (
                  <g key={s.name}>
                    <path d={`M${x},${padT + plotH} v${-(h - Math.min(4, h))} q0,${-Math.min(4, h)} ${Math.min(4, barW / 2)},${-Math.min(4, h)} h${barW - 2 * Math.min(4, barW / 2)} q${Math.min(4, barW / 2)},0 ${Math.min(4, barW / 2)},${Math.min(4, h)} v${h - Math.min(4, h)} z`} fill={s.color}>
                      <title>{`${s.name} — ${label} : ${format(v)}`}</title>
                    </path>
                    {peak ? (
                      <text x={x + barW / 2} y={padT + plotH - h - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={CHART.ink}>
                        {format(v)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {i % step === 0 ? (
                <text x={padL + i * groupW + groupW / 2} y={H - 7} textAnchor="middle" fontSize={11} fill={CHART.axis}>
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        </svg>
      </div>
      <details className="mt-1 text-xs text-slate">
        <summary className="cursor-pointer">{tableLabel}</summary>
        <div className="mt-1 overflow-x-auto">
          <table className="min-w-full text-start">
            <thead>
              <tr>
                <th className="pe-3 text-start font-semibold" />
                {series.map((s) => (
                  <th key={s.name} className="pe-3 text-start font-semibold">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l}>
                  <td className="pe-3">{l}</td>
                  {series.map((s) => (
                    <td key={s.name} className="pe-3 tabular-nums">
                      {format(s.points[i].value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars (single series, one hue, value at the end of each bar). */
export function HBarList({ rows, format, color = CHART.blue, empty }: { rows: { label: ReactNode; value: number; hint?: ReactNode }[]; format: (n: number) => string; color?: string; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-ink" title={typeof r.label === "string" ? r.label : undefined}>
              {r.label}
              {r.hint ? <span className="ms-1.5 text-slate">{r.hint}</span> : null}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-mist-2" role="presentation">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} title={`${format(r.value)}`} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One stacked horizontal bar (2px surface gap between segments) with legend and values. */
export function StackedShare({ segments, format }: { segments: { name: string; color: string; value: number }[]; format: (n: number) => string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <Legend items={segments.map((s) => ({ name: `${s.name} — ${format(s.value)}${total ? ` (${Math.round((s.value / total) * 100)} %)` : ""}`, color: s.color }))} />
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-md bg-mist-2" role="img" aria-label={segments.map((s) => `${s.name}: ${format(s.value)}`).join(", ")}>
        {total > 0
          ? segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div key={s.name} title={`${s.name}: ${format(s.value)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
              ))
          : null}
      </div>
    </div>
  );
}
