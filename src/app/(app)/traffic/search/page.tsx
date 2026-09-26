import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficFineStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { searchTraffic } from "@/server/traffic/queries";
import { Badge, Card, EmptyState, Field, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { TRAFFIC_CONTROL_OUTCOME, TRAFFIC_FINE_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.search.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const day = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);

export default async function TrafficSearchPage({ searchParams }: PageProps<"/traffic/search">) {
  const actor = await requirePermission("traffic:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const f = {
    pv: str(p.pv),
    fine: str(p.fine),
    plate: str(p.plate),
    driver: str(p.driver),
    license: str(p.license),
    cni: str(p.cni),
    violation: str(p.violation),
    officer: str(p.officer),
    stationId: str(p.stationId),
    from: day(str(p.from)),
    to: day(str(p.to)),
    fineStatus: str(p.fineStatus) as TrafficFineStatus | undefined,
    page: Number(p.page ?? 1) || 1,
  };
  const searched = Object.entries(f).some(([k, v]) => k !== "page" && v);
  const [result, stations] = await Promise.all([
    searched ? searchTraffic(actor, f) : Promise.resolve(null),
    prisma.station.findMany({ where: { isActive: true, ...(actor.stationIds ? { id: { in: actor.stationIds } } : {}), ...(actor.scopeLevel === "REGIONAL" && actor.regionId ? { regionId: actor.regionId } : {}) }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
  ]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/search?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.search.title")} subtitle={t("traffic.search.subtitle")} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("traffic.search.pv")} htmlFor="s-pv">
            <input id="s-pv" name="pv" defaultValue={f.pv ?? ""} className="input font-mono" placeholder="PV-2026-000001" />
          </Field>
          <Field label={t("traffic.search.fine")} htmlFor="s-fine">
            <input id="s-fine" name="fine" defaultValue={f.fine ?? ""} className="input font-mono" placeholder="AMD-2026-000001" />
          </Field>
          <Field label={t("traffic.veh.plate")} htmlFor="s-plate">
            <input id="s-plate" name="plate" defaultValue={f.plate ?? ""} className="input font-mono uppercase" placeholder="TD-1234-AB" />
          </Field>
          <Field label={t("traffic.search.driver")} htmlFor="s-driver">
            <input id="s-driver" name="driver" defaultValue={f.driver ?? ""} className="input" />
          </Field>
          <Field label={t("traffic.driver.licenseNumber")} htmlFor="s-lic">
            <input id="s-lic" name="license" defaultValue={f.license ?? ""} className="input font-mono" />
          </Field>
          <Field label={t("traffic.driver.cni")} htmlFor="s-cni" hint={t("traffic.search.cniHint")}>
            <input id="s-cni" name="cni" defaultValue={f.cni ?? ""} className="input font-mono" autoComplete="off" />
          </Field>
          <Field label={t("traffic.col.offence")} htmlFor="s-viol">
            <input id="s-viol" name="violation" defaultValue={f.violation ?? ""} className="input" />
          </Field>
          <Field label={t("traffic.search.officer")} htmlFor="s-off">
            <input id="s-off" name="officer" defaultValue={f.officer ?? ""} className="input" />
          </Field>
          <Field label={t("traffic.col.station")} htmlFor="s-station">
            <Select id="s-station" name="stationId" defaultValue={f.stationId ?? ""} placeholder={t("traffic.search.allStations")} options={stations.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label={t("traffic.fine.status")} htmlFor="s-fs">
            <Select id="s-fs" name="fineStatus" defaultValue={f.fineStatus ?? ""} placeholder={t("traffic.fine.allStatuses")} options={optionsOf(TRAFFIC_FINE_STATUS, locale)} />
          </Field>
          <Field label={t("traffic.filter.from")} htmlFor="s-from">
            <input id="s-from" type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" />
          </Field>
          <Field label={t("traffic.filter.to")} htmlFor="s-to">
            <input id="s-to" type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" />
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="rounded-md bg-blue px-5 py-2 text-sm font-semibold text-white">
              {t("common.search")}
            </button>
            <Link href="/traffic/search" className="text-sm text-blue hover:underline">
              {t("traffic.filter.reset")}
            </Link>
          </div>
        </form>
      </Card>
      {result ? (
        <Card padded={false} title={t("traffic.search.results", { n: result.total })}>
          {result.items.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("traffic.search.none")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("traffic.col.control")}</th>
                  <th>{t("traffic.col.pv")}</th>
                  <th>{t("traffic.col.vehicle")}</th>
                  <th>{t("traffic.col.driver")}</th>
                  <th>{t("traffic.col.offence")}</th>
                  <th className="text-end">{t("traffic.col.amount")}</th>
                  <th>{t("traffic.col.fine")}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((c) => {
                  const fs = c.ticket?.fine ? labelOf(TRAFFIC_FINE_STATUS, c.ticket.fine.status, locale) : null;
                  const o = labelOf(TRAFFIC_CONTROL_OUTCOME, c.outcome, locale);
                  return (
                    <tr key={c.id}>
                      <td data-label={t("traffic.col.control")}>
                        <Link href={`/traffic/controls/${c.id}`} className="font-mono font-semibold text-blue hover:underline">
                          {c.number}
                        </Link>
                        <span className="block text-xs text-slate">{fmtDateTime(c.controlledAt, locale)}</span>
                        <span className="block text-xs text-slate">{c.station.name}</span>
                      </td>
                      <td data-label={t("traffic.col.pv")} className="text-xs">
                        {c.ticket ? (
                          <Link href={`/traffic/tickets/${c.ticket.id}`} className="font-mono font-semibold text-blue hover:underline">
                            {c.ticket.number}
                          </Link>
                        ) : (
                          <Badge tone={o.tone}>{o.label}</Badge>
                        )}
                      </td>
                      <td data-label={t("traffic.col.vehicle")} className="font-mono text-xs font-semibold">
                        {c.plateNumber ?? "—"}
                      </td>
                      <td data-label={t("traffic.col.driver")} className="text-xs">
                        {c.driverPerson ? `${c.driverPerson.lastName} ${c.driverPerson.firstName}` : "—"}
                      </td>
                      <td data-label={t("traffic.col.offence")} className="max-w-xs text-xs">
                        {c.ticket?.offences.map((x) => x.name).join(" ; ") ?? "—"}
                      </td>
                      <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                        {c.ticket && c.ticket.totalFineFcfa > 0 ? fmtFcfa(c.ticket.totalFineFcfa) : "—"}
                      </td>
                      <td data-label={t("traffic.col.fine")} className="text-xs">
                        {c.ticket?.fine && fs ? (
                          <>
                            <Link href={`/traffic/fines/${c.ticket.fine.id}`} className="font-mono font-semibold text-blue hover:underline">
                              {c.ticket.fine.number}
                            </Link>
                            <span className="block">
                              <Badge tone={fs.tone}>{fs.label}</Badge>
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <div className="px-4 pb-3">
            <Pagination page={result.page} pageSize={result.pageSize} total={result.total} hrefFor={qs} t={t} />
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState>{t("traffic.search.prompt")}</EmptyState>
        </Card>
      )}
    </div>
  );
}
