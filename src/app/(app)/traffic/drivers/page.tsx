import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listDrivers } from "@/server/traffic/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Table } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { licenceState } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.driver.listTitle") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function DriversPage({ searchParams }: PageProps<"/traffic/drivers">) {
  const actor = await requirePermission("traffic:drivers_view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), expired: str(p.expired) === "1", page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listDrivers(filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/drivers?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.driver.listTitle")} subtitle={t("traffic.driver.listSubtitle", { n: total })} actions={actor.permissions.has("traffic:drivers_manage") ? <ButtonLink href="/traffic/drivers/new">{t("traffic.driver.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("traffic.driver.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="expired" value="1" defaultChecked={filter.expired} /> {t("traffic.driver.expiredOnly")}
          </label>
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.driver.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.driver.person")}</th>
                <th>{t("traffic.driver.birthDate")}</th>
                <th>{t("traffic.driver.licenseNumber")}</th>
                <th>{t("traffic.driver.licenseCategory")}</th>
                <th>{t("traffic.driver.licenseExpiresAt")}</th>
                <th className="text-end">{t("traffic.driver.controlsCount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const ls = licenceState(d.licenseExpiresAt);
                return (
                  <tr key={d.id}>
                    <td data-label={t("traffic.driver.person")}>
                      <Link href={`/traffic/drivers/${d.id}`} className="font-semibold text-blue hover:underline">
                        {d.person.lastName} {d.person.firstName}
                      </Link>
                      <span className="block font-mono text-xs text-slate">{d.person.number}</span>
                    </td>
                    <td data-label={t("traffic.driver.birthDate")} className="text-xs">
                      {d.person.dateOfBirth ? fmtDate(d.person.dateOfBirth, locale) : "—"}
                    </td>
                    <td data-label={t("traffic.driver.licenseNumber")} className="font-mono text-xs">
                      {d.licenseNumber ?? "—"}
                    </td>
                    <td data-label={t("traffic.driver.licenseCategory")} className="text-xs">
                      {d.licenseCategory ?? "—"}
                    </td>
                    <td data-label={t("traffic.driver.licenseExpiresAt")} className="text-xs">
                      {d.licenseExpiresAt ? fmtDate(d.licenseExpiresAt, locale) : "—"}{" "}
                      {ls === "expired" ? <Badge tone="danger">{t("traffic.driver.expired")}</Badge> : ls === "expiring" ? <Badge tone="warning">{t("traffic.driver.expiring")}</Badge> : null}
                    </td>
                    <td data-label={t("traffic.driver.controlsCount")} className="text-end tabular-nums">
                      {d._count.controls}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qs} t={t} />
        </div>
      </Card>
    </div>
  );
}
