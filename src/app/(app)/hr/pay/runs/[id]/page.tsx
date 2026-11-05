import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getRun, runLines } from "@/server/hr/pay";
import { NotFoundError } from "@/server/errors";
import { getRequestContext } from "@/server/request-context";
import { Alert, Badge, ButtonLink, Card, PageHeader, Pagination, StatCard, Table } from "@/components/ui";
import { PAY_RUN_STATUS, labelOf } from "@/lib/labels";
import { fmtFcfa } from "@/lib/traffic-format";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { ValidateRunForm } from "../../pay-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.run") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function PayRunPage({ params, searchParams }: PageProps<"/hr/pay/runs/[id]">) {
  const actor = await requirePermission("hr:pay_view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  const ctx = await getRequestContext();
  let run;
  try {
    run = await getRun(actor, id, ctx);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const lines = await runLines(actor, id, { q: str(sp.q), page: Number(sp.page ?? 1) || 1 }, ctx);
  const st = labelOf(PAY_RUN_STATUS, run.status, locale);
  const canValidate = actor.permissions.has("hr:pay_validate") && run.status === "DRAFT" && run.generatedById !== actor.id;
  const canExport = actor.permissions.has("hr:pay_export") && run.status === "VALIDATED";
  const qs = (n: number) => `/hr/pay/runs/${id}?${new URLSearchParams({ ...(str(sp.q) ? { q: String(sp.q) } : {}), page: String(n) }).toString()}`;
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.pay.title")}
        title={`${t("hr.pay.run")} ${run.period}`}
        subtitle={`${t("hr.pay.generatedBy", { u: run.generatedBy ?? "—" })}${run.validatedBy ? ` · ${t("hr.pay.validatedBy", { u: run.validatedBy })}` : ""} · ${fmtDateTime(run.createdAt, locale)}`}
        breadcrumbs={[{ href: "/hr/pay", label: t("hr.pay.title") }, { label: run.period }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {canValidate ? <ValidateRunForm id={run.id} /> : null}
            {canExport ? (
              <ButtonLink href={`/api/v1/hr/pay/runs/${run.id}/export`} variant="secondary" size="sm">
                {t("hr.pay.exportCsv")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <Alert tone="warning" className="mb-4">
        {t("hr.pay.confidential")}
      </Alert>
      {run.status === "DRAFT" && run.excludedNoScale > 0 ? (
        <Alert tone="danger" className="mb-4">
          {t("hr.pay.noScaleWarning", { n: run.excludedNoScale })}
        </Alert>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("hr.pay.officers")} value={run.officers} hint={t("hr.pay.suspendedN", { n: run.suspendedCount, p: run.suspendedPercent })} />
        <StatCard label={t("hr.pay.base")} value={fmtFcfa(run.totalBase)} />
        <StatCard label={t("hr.pay.gross")} value={fmtFcfa(run.totalGross)} hint={t("hr.pay.deductionsN", { v: fmtFcfa(run.totalDeductions) })} />
        <StatCard label={t("hr.pay.net")} value={fmtFcfa(run.totalNet)} tone="success" />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("hr.pay.byRank")} padded={false}>
          <Table>
            <tbody>
              {run.byRank.map((r) => (
                <tr key={r.name}>
                  <td data-label={t("hr.col.rank")}>{r.name}</td>
                  <td data-label={t("hr.pay.officers")} className="font-mono text-xs">
                    {r.officers}
                  </td>
                  <td data-label={t("hr.pay.net")} className="font-mono text-xs">
                    {fmtFcfa(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title={t("hr.pay.byDelegation")} padded={false}>
          <Table>
            <tbody>
              {run.byRegion.map((r) => (
                <tr key={r.name}>
                  <td data-label={t("hr.st.delegation")}>{r.name}</td>
                  <td data-label={t("hr.pay.officers")} className="font-mono text-xs">
                    {r.officers}
                  </td>
                  <td data-label={t("hr.pay.net")} className="font-mono text-xs">
                    {fmtFcfa(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
      <Card title={t("hr.pay.lines")} padded={false}>
        <form method="get" className="flex gap-3 p-4">
          <input name="q" defaultValue={str(sp.q) ?? ""} placeholder={t("officers.searchPlaceholder")} className="input max-w-sm" aria-label={t("common.search")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.search")}
          </button>
        </form>
        <Table>
          <thead>
            <tr>
              <th>{t("hr.col.agent")}</th>
              <th>{t("hr.pay.base")}</th>
              <th>{t("hr.pay.gross")}</th>
              <th>{t("hr.pay.deductions")}</th>
              <th>{t("hr.pay.net")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.items.map((l) => (
              <tr key={l.id}>
                <td data-label={t("hr.col.agent")}>
                  <Link href={`/hr/dossiers/${l.officer.id}`} className="font-semibold text-blue hover:underline">
                    {l.officer.lastName}, {l.officer.firstName}
                  </Link>
                  <span className="block font-mono text-[11px] text-slate">{l.officer.badgeNumber}</span>
                </td>
                <td data-label={t("hr.pay.base")} className="font-mono text-xs">
                  {fmtFcfa(l.base)}
                </td>
                <td data-label={t("hr.pay.gross")} className="font-mono text-xs">
                  {fmtFcfa(l.gross)}
                </td>
                <td data-label={t("hr.pay.deductions")} className="font-mono text-xs">
                  {fmtFcfa(l.deductions)}
                </td>
                <td data-label={t("hr.pay.net")} className="font-mono text-xs font-semibold">
                  {fmtFcfa(l.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={lines.page} pageSize={lines.pageSize} total={lines.total} hrefFor={qs} t={t} />
        </div>
      </Card>
    </div>
  );
}
