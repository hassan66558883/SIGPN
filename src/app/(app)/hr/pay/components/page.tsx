import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listComponents } from "@/server/hr/pay";
import { Badge, Card, PageHeader } from "@/components/ui";
import { PAY_CALCULATION, PAY_KIND, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { ComponentForm } from "../pay-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.components") };
}

export default async function PayComponentsPage() {
  const actor = await requirePermission("hr:pay_view");
  const [items, t, locale] = await Promise.all([listComponents(actor, true), getT(), getLocale()]);
  const canManage = actor.permissions.has("hr:pay_manage");
  return (
    <div>
      <PageHeader eyebrow={t("hr.pay.title")} title={t("hr.pay.components")} subtitle={t("hr.pay.componentsHint")} breadcrumbs={[{ href: "/hr/pay", label: t("hr.pay.title") }, { label: t("hr.pay.components") }]} />
      <div className="space-y-3">
        {items.map((c) => (
          <Card key={c.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={labelOf(PAY_KIND, c.kind, locale).tone}>{labelOf(PAY_KIND, c.kind, locale).label}</Badge>
              <span className="font-semibold">{c.name}</span>
              <span className="font-mono text-xs text-slate">{c.code}</span>
              <span className="text-xs text-slate">
                {labelOf(PAY_CALCULATION, c.calculation, locale).label} · {c.defaultValue}
              </span>
              {!c.isActive ? <Badge>{t("officer.inactive")}</Badge> : null}
            </div>
            {canManage ? (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("hr.dossier.edit")}</summary>
                <div className="mt-2">
                  <ComponentForm component={c} />
                </div>
              </details>
            ) : null}
          </Card>
        ))}
        {canManage ? (
          <Card title={t("hr.pay.addComponent")}>
            <ComponentForm />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
