import type { MessageKey } from "@/lib/i18n";

/**
 * "Export as PDF" link, shown ONLY to the heads of each level of command (permission records:export_pdf). The PDF is built by the server
 * with the same scope as the screen, and every export is audited. For a list, the current filters are passed along.
 */
export function ExportPdf({ show, module, params, id, t }: { show: boolean; module: string; params?: Record<string, string | string[] | undefined>; id?: string; t: (k: MessageKey) => string }) {
  if (!show) return null;
  let href = `/api/v1/exports/${module}`;
  if (id) href += `/${id}`;
  else {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if ([...q].length) href += `?${q.toString()}`;
  }
  return (
    <a href={href} download className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-surface" title={t("export.pdf.hint")}>
      <span aria-hidden>⤓</span> {t("export.pdf")}
    </a>
  );
}
