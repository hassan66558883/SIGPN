"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { fmtDate } from "@/lib/format";

export type PersonOption = { id: string; number: string; firstName: string; lastName: string; dateOfBirth: string | Date | null; phone: string | null; city?: string | null };

/**
 * Searchable person selector (server-backed via /api/v1/persons/search, scoped to the caller).
 * Renders a hidden input `name` with the chosen id.
 */
export function PersonPicker({ name, label, required, defaultValue, error, id = "person-picker" }: { name: string; label: string; required?: boolean; defaultValue?: PersonOption | null; error?: string; id?: string }) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonOption[]>([]);
  const [selected, setSelected] = useState<PersonOption | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    timer.current = setTimeout(async () => {
      if (term.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/v1/persons/search?q=${encodeURIComponent(term)}`, { headers: { "x-requested-with": "PMS" } });
        if (!res.ok) return;
        const j = (await res.json()) as { data: PersonOption[] };
        setResults(j.data);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, term.length < 2 ? 0 : 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <label htmlFor={id} className="label">
        {label}
        {required ? <span className="ms-0.5 text-danger">*</span> : null}
      </label>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-mist px-3 py-2 text-sm">
          <span>
            <span className="font-semibold text-ink">
              {selected.lastName}, {selected.firstName}
            </span>{" "}
            <span className="font-mono text-xs text-slate">{selected.number}</span>
            {selected.dateOfBirth ? <span className="text-xs text-slate"> · {fmtDate(selected.dateOfBirth, locale)}</span> : null}
          </span>
          <button type="button" className="text-xs font-semibold text-blue hover:underline" onClick={() => setSelected(null)}>
            ✕
          </button>
        </div>
      ) : (
        <>
          <input id={id} className="input" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={t("persons.searchPlaceholder")} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-listbox`} />
          {open && results.length ? (
            <ul id={`${id}-listbox`} className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white shadow-lg" role="listbox">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-mist"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelected(p);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span>
                      <span className="font-semibold text-ink">
                        {p.lastName}, {p.firstName}
                      </span>
                      <span className="block text-xs text-slate">
                        {p.number}
                        {p.dateOfBirth ? ` · ${fmtDate(p.dateOfBirth, locale)}` : ""}
                        {p.phone ? ` · ${p.phone}` : ""}
                        {p.city ? ` · ${p.city}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1 text-xs text-slate">{t("person.pickerHint")}</p>
        </>
      )}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
