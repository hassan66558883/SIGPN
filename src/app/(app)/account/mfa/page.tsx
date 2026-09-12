import type { Metadata } from "next";
import { requireActor } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { Alert, Card, PageHeader, Badge } from "@/components/ui";
import { MfaEnrol, MfaManage } from "./mfa-client";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("mfa.title") };
}

export default async function MfaPage({ searchParams }: PageProps<"/account/mfa">) {
  const actor = await requireActor({ allowPending: true });
  const [params, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const forced = params.forced === "1" || (actor.roleRequiresMfa && !actor.mfaEnabled);
  const recovery = actor.mfaEnabled ? await prisma.mfaRecoveryCode.count({ where: { userId: actor.id, usedAt: null } }) : 0;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={t("account.eyebrow")} title={t("mfa.title")} breadcrumbs={[{ href: "/account", label: t("account.title") }, { label: t("mfa.crumb") }]} />
      {forced ? (
        <Alert tone="warning" className="mb-4" title={t("mfa.forcedTitle")}>
          {t("mfa.forcedBody", { role: roleName(actor.roleCode, actor.roleName, locale) })}
        </Alert>
      ) : null}
      <Card title={actor.mfaEnabled ? t("mfa.cardEnabled") : t("mfa.cardSetup")} actions={actor.mfaEnabled ? <Badge tone="success">{t("account.enabled")}</Badge> : <Badge tone="warning">{t("account.notEnabled")}</Badge>}>
        {actor.mfaEnabled ? <MfaManage recoveryRemaining={recovery} canDisable={!actor.roleRequiresMfa} /> : <MfaEnrol />}
      </Card>
    </div>
  );
}
