"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

export type SidebarSection = { title: string | null; items: { href: string; label: string; icon: string }[] };

function NavList({ sections, onNavigate }: { sections: SidebarSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t("nav.main")}>
      {sections.map((section, i) => (
        <div key={i} className="mb-4">
          {section.title ? <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">{section.title}</p> : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href === "/biometric" && pathname.startsWith("/biometric/") && !pathname.startsWith("/biometric/control")) || (item.href === "/alerts" && pathname.startsWith("/alerts/") && !pathname.startsWith("/alerts/supervision")) || (item.href !== "/alerts" && item.href !== "/alerts/supervision" && item.href !== "/biometric" && item.href !== "/biometric/control" && item.href !== "/dashboard" && item.href !== "/traffic" && item.href !== "/traffic/cash" && item.href !== "/hr" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx("flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition", active ? "border-s-2 border-gold bg-gold/15 font-semibold text-gold" : "border-s-2 border-transparent text-white/80 hover:bg-white/10 hover:text-white")}
                  >
                    <span className="w-7 shrink-0 text-center text-[22px] leading-none opacity-90" aria-hidden>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  const t = useT();
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/emblem.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
      <div>
        <p className="text-sm font-bold leading-tight">{t("app.short")}</p>
        <p className="text-[10px] uppercase tracking-widest text-gold">{t("app.tagline")}</p>
      </div>
    </div>
  );
}

/** Desktop sidebar (≥ lg). */
export function Sidebar({ sections }: { sections: SidebarSection[] }) {
  const t = useT();
  return (
    <aside className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col self-start bg-navy text-white lg:flex">
      <NavList sections={sections} />
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-sm font-extrabold tracking-wide">TECHNOTCHAD</p>
        <p className="text-[10px] text-white/60">Smart Solutions. Real Transformation</p>
        <p className="mt-1 text-[10px] leading-snug text-white/40">{t("app.sidebarFooter")}</p>
      </div>
    </aside>
  );
}

/** Mobile drawer (< lg), toggled from the header. */
export function MobileNav({ sections }: { sections: SidebarSection[] }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 text-white/85 hover:bg-white/10 hover:text-white lg:hidden" aria-label={t("nav.openMenu")} aria-expanded={open} aria-controls="mobile-nav">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" id="mobile-nav">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy text-white shadow-2xl">
            <div className="flex items-center justify-between pe-3">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-white/80 hover:bg-white/10" aria-label={t("nav.closeMenu")}>
                ✕
              </button>
            </div>
            <NavList sections={sections} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
