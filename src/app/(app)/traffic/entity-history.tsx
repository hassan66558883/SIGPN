import { prisma } from "@/server/db";
import { Card, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { TFunction } from "@/lib/i18n";

/** Audit trail of a traffic record: every creation, change of status, payment or cancellation (from the immutable audit log). */
export async function EntityHistory({ entities, locale, t }: { entities: { type: string; id: string }[]; locale: Locale; t: TFunction }) {
  const rows = await prisma.auditLog.findMany({
    where: { OR: entities.map((e) => ({ entityType: e.type, entityId: e.id })) },
    orderBy: { at: "desc" },
    take: 60,
    select: { id: true, at: true, action: true, actorLabel: true, summary: true, outcome: true },
  });
  return (
    <Card title={t("traffic.history.title")} description={t("traffic.history.hint")}>
      {rows.length === 0 ? (
        <EmptyState>{t("traffic.history.none")}</EmptyState>
      ) : (
        <ol className="space-y-3 border-s border-line ps-4">
          {rows.map((r) => (
            <li key={r.id} className="relative text-sm">
              <span aria-hidden className="absolute -start-[21px] top-1.5 h-2 w-2 rounded-full bg-blue" />
              <p className="text-ink">{r.summary}</p>
              <p className="text-xs text-slate">
                {fmtDateTime(r.at, locale)} · {r.actorLabel} · <span className="font-mono">{r.action}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
