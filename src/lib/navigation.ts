import type { Permission } from "@/server/rbac/permissions";
import type { MessageKey } from "@/lib/i18n";

export type NavItem = { href: string; labelKey: MessageKey; permission: Permission; anyOf?: Permission[]; icon: string };
export type NavSection = { titleKey: MessageKey | null; items: NavItem[] };

/** Icons are simple glyphs to keep the bundle dependency-free. Labels are message keys. */
export const NAVIGATION: NavSection[] = [
  {
    titleKey: null,
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", permission: "dashboard:view", icon: "▦" },
      { href: "/search", labelKey: "nav.search", permission: "persons:view", icon: "⌕" },
    ],
  },
  {
    titleKey: "nav.section.frontDesk",
    items: [
      { href: "/complaints", labelKey: "nav.complaints", permission: "complaints:view", icon: "✉" },
      { href: "/incidents", labelKey: "nav.incidents", permission: "incidents:view", icon: "⚠" },
      { href: "/persons", labelKey: "nav.persons", permission: "persons:view", icon: "☺" },
      { href: "/wanted", labelKey: "nav.wanted", permission: "wanted:view", icon: "⚑" },
      { href: "/alerts", labelKey: "nav.alerts", permission: "alerts:view", icon: "◬" },
      { href: "/alerts/supervision", labelKey: "nav.alerts.supervision", permission: "alerts:supervise", icon: "◎" },
    ],
  },
  {
    titleKey: "nav.section.investigation",
    items: [
      { href: "/cases", labelKey: "nav.cases", permission: "cases:view", icon: "▤" },
      { href: "/investigations", labelKey: "nav.investigations", permission: "investigations:view", icon: "◉" },
      { href: "/tasks", labelKey: "nav.tasks", permission: "investigations:view", icon: "☑" },
      { href: "/evidence", labelKey: "nav.evidence", permission: "evidence:view", icon: "◈" },
      { href: "/statements", labelKey: "nav.statements", permission: "statements:view", icon: "✎" },
      { href: "/interviews", labelKey: "nav.interviews", permission: "interviews:view", icon: "♫" },
      { href: "/biometric", labelKey: "nav.biometric", permission: "biometric:history_view", anyOf: ["biometric:search_fingerprint", "biometric:search_face", "biometric:search_voice", "biometric:search_anpr", "biometric:manage", "biometric:verify"], icon: "⚛" },
    ],
  },
  {
    titleKey: "nav.section.enforcement",
    items: [
      { href: "/warrants", labelKey: "nav.warrants", permission: "warrants:view", icon: "⚖" },
      { href: "/arrests", labelKey: "nav.arrests", permission: "arrests:view", icon: "⛓" },
      { href: "/detention", labelKey: "nav.detention", permission: "detention:view", icon: "▣" },
    ],
  },
  {
    titleKey: "nav.section.traffic",
    items: [
      { href: "/traffic", labelKey: "nav.traffic.dashboard", permission: "traffic:dashboard", icon: "◧" },
      { href: "/traffic/controls", labelKey: "nav.traffic.controls", permission: "traffic:view", icon: "⚑" },
      { href: "/traffic/tickets", labelKey: "nav.traffic.tickets", permission: "traffic:view", icon: "▤" },
      { href: "/traffic/fines", labelKey: "nav.traffic.fines", permission: "traffic:view", icon: "₣" },
      { href: "/traffic/drivers", labelKey: "nav.traffic.drivers", permission: "traffic:drivers_view", icon: "☺" },
      { href: "/traffic/vehicles", labelKey: "nav.traffic.vehicles", permission: "traffic:vehicles_view", icon: "⛟" },
      { href: "/traffic/violations", labelKey: "nav.traffic.violations", permission: "traffic:violations_view", icon: "§" },
      { href: "/traffic/search", labelKey: "nav.traffic.search", permission: "traffic:view", icon: "⌕" },
    ],
  },
  {
    titleKey: "cash.section",
    items: [
      { href: "/traffic/cash", labelKey: "cash.nav.dashboard", permission: "cash:reports", icon: "◨" },
      { href: "/traffic/cash/registers", labelKey: "cash.nav.registers", permission: "cash:view", anyOf: ["cash:register"], icon: "▣" },
      { href: "/traffic/cash/collections", labelKey: "cash.nav.collections", permission: "cash:view", anyOf: ["cash:register"], icon: "₣" },
      { href: "/traffic/cash/closures", labelKey: "cash.nav.closures", permission: "cash:view", anyOf: ["cash:register"], icon: "⊟" },
      { href: "/traffic/cash/deposits", labelKey: "cash.nav.deposits", permission: "cash:view", anyOf: ["cash:register"], icon: "⇥" },
      { href: "/traffic/cash/slips", labelKey: "cash.nav.slips", permission: "cash:view", anyOf: ["cash:register"], icon: "▤" },
      { href: "/traffic/cash/reconciliation", labelKey: "cash.nav.reconciliation", permission: "cash:view", icon: "⇄" },
      { href: "/traffic/cash/discrepancies", labelKey: "cash.nav.discrepancies", permission: "cash:view", anyOf: ["cash:register"], icon: "≠" },
      { href: "/traffic/cash/reports", labelKey: "cash.nav.reports", permission: "cash:reports", icon: "≡" },
      { href: "/traffic/cash/audit", labelKey: "cash.nav.audit", permission: "audit:view", anyOf: [], icon: "☷" },
    ],
  },
  {
    titleKey: "nav.section.operations",
    items: [
      { href: "/patrols", labelKey: "nav.patrols", permission: "patrols:view", icon: "➶" },
      { href: "/operations", labelKey: "nav.operations", permission: "operations:view", icon: "◎" },
    ],
  },
  {
    titleKey: "nav.section.resources",
    items: [
      { href: "/officers", labelKey: "nav.officers", permission: "officers:view", icon: "★" },
      { href: "/vehicles", labelKey: "nav.vehicles", permission: "vehicles:view", icon: "⛟" },
      { href: "/documents", labelKey: "nav.documents", permission: "documents:view", icon: "▭" },
      { href: "/reports", labelKey: "nav.reports", permission: "reports:view", icon: "≡" },
      { href: "/statistics", labelKey: "nav.statistics", permission: "statistics:view", icon: "▥" },
    ],
  },
  {
    titleKey: "hr.section",
    items: [
      { href: "/hr", labelKey: "nav.hr.overview", permission: "hr:view", icon: "◆" },
      { href: "/hr/dossiers", labelKey: "nav.hr.dossiers", permission: "hr:view", icon: "▤" },
      { href: "/hr/transfers", labelKey: "nav.hr.transfers", permission: "hr:view", icon: "⇄" },
      { href: "/hr/rotation", labelKey: "nav.hr.rotation", permission: "hr:view", icon: "↻" },
      { href: "/hr/attendance", labelKey: "nav.hr.attendance", permission: "hr:view", icon: "✓" },
      { href: "/hr/leaves", labelKey: "nav.hr.leaves", permission: "hr:view", icon: "☀" },
      { href: "/hr/training", labelKey: "nav.hr.training", permission: "hr:view", icon: "✎" },
      { href: "/hr/documents", labelKey: "nav.hr.documents", permission: "hr:view", icon: "▭" },
      { href: "/hr/discipline", labelKey: "nav.hr.discipline", permission: "hr:discipline_view", icon: "⚖" },
      { href: "/hr/leaves/mine", labelKey: "nav.hr.myLeaves", permission: "dashboard:view", icon: "☺" },
      { href: "/hr/pay", labelKey: "nav.hr.pay", permission: "hr:pay_view", icon: "₣" },
      { href: "/hr/pay/mine", labelKey: "nav.hr.myPay", permission: "dashboard:view", icon: "◔" },
    ],
  },
  {
    titleKey: "nav.section.administration",
    items: [
      { href: "/admin/organization", labelKey: "nav.organization", permission: "org:view", icon: "⌂" },
      { href: "/admin/users", labelKey: "nav.users", permission: "users:view", icon: "⚙" },
      { href: "/admin/roles", labelKey: "nav.roles", permission: "roles:view", icon: "⚿" },
      { href: "/admin/security", labelKey: "nav.security", permission: "security:view", icon: "⛨" },
      { href: "/admin/system", labelKey: "nav.system", permission: "system:settings", icon: "☰" },
      { href: "/audit", labelKey: "nav.audit", permission: "audit:view", icon: "☷" },
    ],
  },
];
