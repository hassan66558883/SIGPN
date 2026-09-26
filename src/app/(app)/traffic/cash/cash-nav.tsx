import { forbidden } from "next/navigation";
import { logAudit } from "@/server/audit";
import { canAny, requireActor, type Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { TFunction } from "@/lib/i18n";
import { Tabs } from "@/components/ui";

/** Page guard for the revenue module: the actor must hold at least one of the permissions. */
export async function requireCash(anyOf: Permission[]): Promise<Actor> {
  const actor = await requireActor();
  if (!canAny(actor, anyOf)) {
    await logAudit({ actor, action: "ACCESS_DENIED", module: "cash", outcome: "DENIED", summary: `Page access denied: one of ${anyOf.join(", ")} required (role ${actor.roleCode})` });
    forbidden();
  }
  return actor;
}

export const CASH_ANY: Permission[] = ["cash:view", "cash:register"];

/** Sub-navigation of « Gestion des recettes et versements ». */
export function CashTabs({ actor, current, t }: { actor: Actor; current: string; t: TFunction }) {
  const p = actor.permissions;
  const any = p.has("cash:view") || p.has("cash:register");
  const items = [
    p.has("cash:reports") ? { href: "/traffic/cash", label: t("cash.nav.dashboard") } : null,
    any ? { href: "/traffic/cash/registers", label: t("cash.nav.registers") } : null,
    any ? { href: "/traffic/cash/collections", label: t("cash.nav.collections") } : null,
    any ? { href: "/traffic/cash/closures", label: t("cash.nav.closures") } : null,
    any ? { href: "/traffic/cash/deposits", label: t("cash.nav.deposits") } : null,
    any ? { href: "/traffic/cash/slips", label: t("cash.nav.slips") } : null,
    p.has("cash:view") ? { href: "/traffic/cash/reconciliation", label: t("cash.nav.reconciliation") } : null,
    any ? { href: "/traffic/cash/discrepancies", label: t("cash.nav.discrepancies") } : null,
    p.has("cash:reports") ? { href: "/traffic/cash/reports", label: t("cash.nav.reports") } : null,
    any ? { href: "/traffic/cash/search", label: t("cash.nav.search") } : null,
    p.has("audit:view") ? { href: "/traffic/cash/audit", label: t("cash.nav.audit") } : null,
  ].filter((x): x is { href: string; label: string } => x !== null);
  return <Tabs items={items} current={current} />;
}

export const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
export const day = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);

export function qsBuilder(base: string, p: Record<string, unknown>) {
  return (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `${base}?${s.toString()}`;
  };
}
