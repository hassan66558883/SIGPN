"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";

type Method = "MOBILE_MONEY" | "ELECTRONIC" | "BANK_TRANSFER";
type Fine = {
  pvNumber: string;
  fineNumber: string;
  status: string;
  dueDate: string | null;
  station: string;
  amountFcfa: number;
  amountPaidFcfa: number;
  remainingFcfa: number;
  payable: boolean;
  paymentInProgress: boolean;
  methods: Method[];
  operators: { code: string; label: string; methods: Method[] }[];
  partialAllowed: boolean;
};
type Started = { number: string; accessCode: string; instructions: string };
type Status = { status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED"; message: string | null; receipt: { number: string; verificationToken: string } | null };

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;

async function call<T>(path: string, body: unknown): Promise<{ status: number; data?: T }> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { data?: T };
  return { status: res.status, data: json.data };
}

export function PayFineForm({ sandbox }: { sandbox: boolean }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ids, setIds] = useState<{ pvNumber: string; plate: string } | null>(null);
  const [fine, setFine] = useState<Fine | null>(null);
  const [started, setStarted] = useState<Started | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [op, setOp] = useState<string>("");

  const reset = () => {
    setFine(null);
    setStarted(null);
    setStatus(null);
    setError(null);
  };

  async function find(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    reset();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const pvNumber = String(f.get("pv") || "");
    const plate = String(f.get("plate") || "");
    try {
      const r = await call<Fine>("/api/v1/public/fines/lookup", { pvNumber, plate });
      if (r.status === 429) setError(t("pub.pay.rate"));
      else if (r.status === 409 || r.status === 503) setError(t("pub.pay.off"));
      else if (!r.data) setError(t("pub.pay.notFound"));
      else {
        setIds({ pvNumber, plate });
        setFine(r.data);
      }
    } catch {
      setError(t("pub.pay.error"));
    } finally {
      setBusy(false);
    }
  }

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids || !fine) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const provider = String(f.get("provider") || fine.operators[0]?.code || "");
    const method = String(f.get("method")) as Method;
    const amount = f.get("amount") ? Number(f.get("amount")) : undefined;
    try {
      const r = await call<Started>("/api/v1/public/fines/pay", { ...ids, method, provider, phone: String(f.get("phone") || "") || undefined, ...(amount && fine.partialAllowed ? { amountFcfa: amount } : {}) });
      if (r.status === 201 && r.data) {
        setStarted(r.data);
        setStatus({ status: "PENDING", message: null, receipt: null });
      } else if (r.status === 429) setError(t("pub.pay.rate"));
      else if (r.status === 409) setError(t("pub.pay.inProgress"));
      else setError(t("pub.pay.error"));
    } catch {
      setError(t("pub.pay.error"));
    } finally {
      setBusy(false);
    }
  }

  const poll = useCallback(async () => {
    if (!started) return;
    const r = await call<Status>("/api/v1/public/fines/pay/status", { number: started.number, code: started.accessCode }).catch(() => null);
    if (r?.data) setStatus(r.data);
  }, [started]);

  useEffect(() => {
    if (!started || status?.status !== "PENDING") return;
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [started, status?.status, poll]);

  async function simulate(outcome: "SUCCESS" | "FAILED") {
    if (!started) return;
    setBusy(true);
    await call("/api/v1/public/fines/pay/sandbox", { number: started.number, code: started.accessCode, outcome }).catch(() => null);
    await poll();
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <form onSubmit={find} className="grid gap-4 rounded-xl border border-line bg-card p-5 sm:grid-cols-3 sm:items-end">
          <div>
            <label htmlFor="pf-pv" className="label">{t("pub.pay.pv")}</label>
            <input id="pf-pv" name="pv" className="input font-mono uppercase" placeholder="PV-2026-000001" autoComplete="off" required />
          </div>
          <div>
            <label htmlFor="pf-plate" className="label">{t("pub.pay.plate")}</label>
            <input id="pf-plate" name="plate" className="input font-mono uppercase" autoComplete="off" required />
          </div>
          <button type="submit" disabled={busy} className="rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-navy hover:brightness-110 disabled:opacity-60">{t("pub.pay.find")}</button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}

      {fine && !started ? (
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="font-mono text-sm text-slate">{fine.pvNumber} · {fine.fineNumber}</p>
          <p className="mt-1 text-sm text-slate">{t("pub.pay.station")} {fine.station}{fine.dueDate ? ` · ${t("pub.pay.due")} ${new Date(fine.dueDate).toLocaleDateString()}` : ""}</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="label">{t("pub.pay.amountDue")}</dt><dd className="font-bold text-ink">{fcfa(fine.amountFcfa)}</dd></div>
            <div><dt className="label">{t("pub.pay.alreadyPaid")}</dt><dd className="font-bold text-ink">{fcfa(fine.amountPaidFcfa)}</dd></div>
            <div><dt className="label">{t("pub.pay.remaining")}</dt><dd className="text-lg font-extrabold text-gold">{fcfa(fine.remainingFcfa)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-slate">{t(`pub.pay.st.${fine.status}` as MessageKey)}</p>

          {!fine.payable ? (
            <p className="mt-4 text-sm font-semibold text-ink">{t("pub.pay.notPayable")}</p>
          ) : fine.paymentInProgress ? (
            <p className="mt-4 text-sm font-semibold text-ink">{t("pub.pay.inProgress")}</p>
          ) : (
            <form onSubmit={pay} className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              {fine.operators.length > 1 ? (
                <div>
                  <label htmlFor="pf-op" className="label">{t("pub.pay.operator")}</label>
                  <select id="pf-op" name="provider" className="input" value={op || fine.operators[0].code} onChange={(e) => setOp(e.target.value)}>
                    {fine.operators.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                  </select>
                </div>
              ) : null}
              <div>
                <label htmlFor="pf-method" className="label">{t("pub.pay.method")}</label>
                <select id="pf-method" name="method" className="input" key={op || fine.operators[0]?.code} defaultValue="MOBILE_MONEY">
                  {(fine.operators.find((o) => o.code === (op || fine.operators[0]?.code))?.methods ?? fine.methods).map((m) => <option key={m} value={m}>{t(`pub.pay.m.${m}` as MessageKey)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pf-phone" className="label">{t("pub.pay.phone")}</label>
                <input id="pf-phone" name="phone" type="tel" inputMode="tel" className="input font-mono" placeholder="+235 6X XX XX XX" autoComplete="tel" />
              </div>
              {fine.partialAllowed ? (
                <div>
                  <label htmlFor="pf-amount" className="label">{t("pub.pay.amount")}</label>
                  <input id="pf-amount" name="amount" type="number" min={1} max={fine.remainingFcfa} defaultValue={fine.remainingFcfa} className="input" />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy} className="rounded-md bg-gold px-6 py-2.5 text-sm font-bold text-navy hover:brightness-110 disabled:opacity-60">{t("pub.pay.payNow")} · {fcfa(fine.remainingFcfa)}</button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {started && status ? (
        <div role="status" className="rounded-xl border border-line bg-card p-5">
          {status.status === "PENDING" ? (
            <>
              <p className="text-lg font-bold text-ink">{t("pub.pay.pendingTitle")}</p>
              <p className="mt-1 text-sm text-slate">{started.instructions}</p>
              <p className="mt-2 text-sm text-slate">{t("pub.pay.pendingHelp")}</p>
            </>
          ) : status.status === "SUCCEEDED" ? (
            <>
              <p className="text-lg font-bold text-success">{t("pub.pay.successTitle")}</p>
              <p className="mt-1 text-sm text-slate">{t("pub.pay.successHelp")}</p>
              {status.receipt ? (
                <p className="mt-3 text-sm">
                  {t("pub.pay.receipt")} <span className="font-mono font-bold">{status.receipt.number}</span> ·{" "}
                  <a className="font-semibold text-gold underline" href={`/verify/receipt/${status.receipt.verificationToken}`}>{t("pub.pay.verifyReceipt")}</a>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-danger">{status.status === "EXPIRED" ? t("pub.pay.expiredTitle") : t("pub.pay.failedTitle")}</p>
              {status.message ? <p className="mt-1 text-sm text-slate">{status.message}</p> : null}
              <button type="button" onClick={reset} className="mt-3 rounded-md border border-gold px-4 py-2 text-sm font-bold text-gold hover:bg-gold hover:text-navy">{t("pub.pay.retry")}</button>
            </>
          )}
          <p className="mt-4 text-xs text-slate">
            {t("pub.pay.number")} : <span className="font-mono font-bold">{started.number}</span> · {t("pub.pay.code")} : <span className="font-mono font-bold">{started.accessCode}</span>
          </p>
          {sandbox && status.status === "PENDING" ? (
            <div className="mt-4 rounded-md border border-dashed border-line p-3">
              <p className="text-xs font-bold text-ink">{t("pub.pay.sandboxTitle")}</p>
              <p className="text-xs text-slate">{t("pub.pay.sandboxHelp")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => simulate("SUCCESS")} className="rounded-md bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">{t("pub.pay.simOk")}</button>
                <button type="button" disabled={busy} onClick={() => simulate("FAILED")} className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-60">{t("pub.pay.simKo")}</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
