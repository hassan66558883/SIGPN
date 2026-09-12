import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Tone } from "@/lib/labels";
import type { TFunction } from "@/lib/i18n";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success" | "warning";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:cursor-not-allowed disabled:opacity-60";
const buttonVariants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-dark",
  secondary: "border border-line bg-white text-ink hover:bg-mist",
  danger: "bg-danger text-white hover:bg-red-800",
  success: "bg-success text-white hover:bg-green-800",
  warning: "bg-warning text-white hover:bg-amber-800",
  ghost: "text-slate hover:bg-mist hover:text-ink",
};

export function Button({ variant = "primary", className, size, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "xs" }) {
  return <button className={cx(buttonBase, buttonVariants[variant], size === "sm" && "px-2.5 py-1.5 text-xs", size === "xs" && "px-2 py-1 text-[11px]", className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, href, children, size }: { variant?: Variant; className?: string; href: string; children: ReactNode; size?: "sm" | "xs" }) {
  return (
    <Link href={href} className={cx(buttonBase, buttonVariants[variant], size === "sm" && "px-2.5 py-1.5 text-xs", size === "xs" && "px-2 py-1 text-[11px]", className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, title, actions, id, description, padded = true }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode; id?: string; description?: ReactNode; padded?: boolean }) {
  return (
    <section id={id} className={cx("rounded-xl border border-line bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            {title ? <h2 className="text-sm font-bold text-navy">{title}</h2> : <span />}
            {description ? <p className="mt-0.5 text-xs text-slate">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={padded ? "p-4 sm:p-5" : ""}>{children}</div>
    </section>
  );
}

const badgeTones: Record<Tone, string> = {
  neutral: "bg-mist-2 text-slate",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: ReactNode }) {
  const tones: Record<Tone, string> = {
    neutral: "border-line bg-mist text-ink",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-info/30 bg-info-soft text-info",
    violet: "border-violet/30 bg-violet-soft text-violet",
  };
  return (
    <div role="alert" className={cx("rounded-md border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="mb-1 font-bold">{title}</p> : null}
      {children}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className, required }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required ? <span className="ms-0.5 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({ options, placeholder, className, ...props }: ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select className={cx("input", className)} {...props}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, breadcrumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; breadcrumbs?: { href?: string; label: string }[] }) {
  return (
    <div className="mb-6">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {b.href ? (
                <Link href={b.href} className="hover:text-blue">
                  {b.label}
                </Link>
              ) : (
                <span className="text-ink">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-blue">{eyebrow}</p> : null}
          <h1 className="break-words text-2xl font-bold tracking-tight text-navy">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "neutral", href }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string }) {
  const accent: Record<Tone, string> = {
    neutral: "border-s-navy",
    success: "border-s-success",
    warning: "border-s-warning",
    danger: "border-s-danger",
    info: "border-s-blue",
    violet: "border-s-violet",
  };
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate">{hint}</p> : null}
    </>
  );
  const cls = cx("block rounded-lg border border-line border-s-4 bg-white px-4 py-3 shadow-sm", accent[tone], href && "transition hover:shadow-md");
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-slate">
      <p>{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function DL({ items, cols = 2 }: { items: { label: ReactNode; value: ReactNode }[]; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <dl className={cx("grid gap-x-6 gap-y-3 text-sm", cols === 1 && "grid-cols-1", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-2 lg:grid-cols-3", cols === 4 && "sm:grid-cols-2 lg:grid-cols-4")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate">{it.label}</dt>
          <dd className="mt-0.5 break-words text-ink">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const AVATAR_COLORS = ["#1e5aa8", "#0f766e", "#b45309", "#6d28d9", "#be123c", "#0369a1", "#4d7c0f", "#7c2d12"];

export function Avatar({ firstName, lastName, seed = 0, size = 36, className }: { firstName: string; lastName: string; seed?: number; size?: number; className?: string }) {
  const ini = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const color = AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)} style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.38) }} aria-hidden>
      {ini}
    </span>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; count?: number }[]; current: string }) {
  return (
    <nav className="no-print -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      <div className="flex min-w-max gap-1 border-b border-line">
        {items.map((t) => {
          const active = t.href === current;
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cx("-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition", active ? "border-blue text-blue" : "border-transparent text-slate hover:border-line hover:text-ink")}>
              {t.label}
              {t.count !== undefined ? <span className={cx("rounded-full px-1.5 text-[11px]", active ? "bg-blue/10 text-blue" : "bg-mist-2 text-slate")}>{t.count}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Stepper({ steps, current }: { steps: { key: string; label: string }[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span className={cx("inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold", state === "done" && "bg-success text-white", state === "current" && "bg-blue text-white ring-4 ring-blue/20", state === "todo" && "bg-mist-2 text-slate")}>{state === "done" ? "✓" : i + 1}</span>
            <span className={cx("font-medium", state === "current" ? "text-blue" : state === "done" ? "text-ink" : "text-slate")}>{s.label}</span>
            {i < steps.length - 1 ? <span className="mx-1 h-px w-4 bg-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Responsive table: renders as a normal table ≥ md and as stacked cards below (cells need data-label). */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="table responsive-table">{children}</table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, hrefFor, t }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string; t: TFunction }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-slate">{t("common.records", { total })}</p>;
  return (
    <nav className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate" aria-label="Pagination">
      <span>{t("common.pagination", { page, pages, total })}</span>
      <span className="flex gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded border border-line px-2 py-1 hover:bg-mist">
            {t("common.previous")}
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="rounded border border-line px-2 py-1 hover:bg-mist">
            {t("common.next")}
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink">{children}</kbd>;
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cx("select-all break-all rounded bg-mist px-1.5 py-0.5 font-mono text-xs text-ink", className)}>{children}</code>;
}
