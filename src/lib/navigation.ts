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
