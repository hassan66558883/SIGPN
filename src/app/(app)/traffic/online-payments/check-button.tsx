"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Asks the operator again where a pending payment stands, then refreshes the list. */
export function CheckButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/v1/traffic/online-payments/${id}/check`, { method: "POST", headers: { "x-requested-with": "PMS" } }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-bg disabled:opacity-60"
    >
      {label}
    </button>
  );
}
