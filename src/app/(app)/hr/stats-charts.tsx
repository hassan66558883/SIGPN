"use client";

import Link from "next/link";
import { useState } from "react";
import { CHART, ColumnChart, type Series } from "@/components/charts";
import { cx } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

type Row = { label: string; value: number; href?: string };
type BarTab = { key: string; label: string; rows: Row[] };

function Tabs<T extends { key: string; label: string }>({ tabs, current, onChange, name }: { tabs: T[]; current: string; onChange: (k: string) => void; name: string }) {
  return (
    <div role="tablist" aria-label={name} className="mb-3 inline-flex flex-wrap gap-1 rounded-md bg-mist p-1">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={current === t.key} onClick={() => onChange(t.key)} className={cx("rounded px-2.5 py-1 text-xs font-semibold transition", current === t.key ? "bg-white text-navy shadow-sm" : "text-slate hover:text-ink")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Horizontal bars with a switchable breakdown (grade / délégation / structure / sex); each bar drills down to the dossiers it counts. */
export function BarsSwitcher({ tabs, name }: { tabs: BarTab[]; name: string }) {
  const t = useT();
  const [key, setKey] = useState(tabs[0]?.key ?? "");
  const [hover, setHover] = useState<string | null>(null);
  const tab = tabs.find((x) => x.key === key) ?? tabs[0];
  if (!tab) return null;
  const total = tab.rows.reduce((a, r) => a + r.value, 0);
  const max = Math.max(1, ...tab.rows.map((r) => r.value));
  return (
    <div>
      <Tabs tabs={tabs} current={tab.key} onChange={setKey} name={name} />
      {tab.rows.length === 0 ? (
        <p className="text-sm text-slate">{t("hr.st.noData")}</p>
      ) : (
        <ul className="space-y-1" onMouseLeave={() => setHover(null)}>
          {tab.rows.map((r) => {
            const pct = total ? (r.value / total) * 100 : 0;
            const body = (
              <div className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded px-1.5 py-1 text-sm transition", hover === r.label && "bg-mist")}>
                <div>
                  <div className="mb-0.5 truncate text-xs text-ink">{r.label}</div>
                  <div className="h-2.5 rounded-sm bg-mist-2">
                    <div className="h-2.5 rounded-sm" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: CHART.blue }} />
                  </div>
                </div>
                <div className="text-end font-mono text-xs">
                  {r.value}
                  <span className="ms-1 text-slate">({pct.toFixed(1)} %)</span>
                </div>
              </div>
            );
            return (
              <li key={r.label} onMouseEnter={() => setHover(r.label)} title={`${r.label} : ${r.value} (${pct.toFixed(1)} %)`}>
                {r.href ? (
                  <Link href={r.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type SeriesTab = { key: string; label: string; series: Series[] };

/** Monthly column chart with a switchable indicator (transfers / promotions / absences). */
export function SeriesSwitcher({ tabs, name, tableLabel }: { tabs: SeriesTab[]; name: string; tableLabel: string }) {
  const [key, setKey] = useState(tabs[0]?.key ?? "");
  const tab = tabs.find((x) => x.key === key) ?? tabs[0];
  if (!tab) return null;
  const n = (v: number) => String(Math.round(v));
  return (
    <div>
      <Tabs tabs={tabs} current={tab.key} onChange={setKey} name={name} />
      <ColumnChart title={tab.label} tableLabel={tableLabel} format={n} series={tab.series} />
    </div>
  );
}
