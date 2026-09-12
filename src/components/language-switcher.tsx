import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { setLocaleAction } from "@/server/i18n-actions";
import { cx } from "@/components/ui";

/** FR | EN toggle. French is the default; the choice is stored in a cookie. */
export function LanguageSwitcher({ current, dark, label }: { current: Locale; dark?: boolean; label: string }) {
  return (
    <form action={setLocaleAction} className="inline-flex items-center gap-1" aria-label={label}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          title={LOCALE_NAMES[l]}
          aria-pressed={l === current}
          className={cx(
            "rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide transition",
            l === current ? (dark ? "bg-white/20 text-white" : "bg-navy text-white") : dark ? "text-white/60 hover:text-white" : "text-slate hover:bg-mist hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
