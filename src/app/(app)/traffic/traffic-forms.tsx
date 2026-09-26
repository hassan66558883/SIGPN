"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Badge, Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { PersonPicker } from "@/components/person-picker";
import { TRAFFIC_CATEGORY, TRAFFIC_FINE_STATUS, TRAFFIC_OFFENCE_CLASS, TRAFFIC_PAYMENT_METHOD, TRAFFIC_VEHICLE_DOC_TYPE, TRAFFIC_VEHICLE_STATUS, TRAFFIC_VEHICLE_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { toInputDate, toInputDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { addVehicleDocumentAction, attachEvidenceAction, cancelTicketAction, createDriverAction, createVehicleAction, openCaseFromTicketAction, recordControlAction, recordPaymentAction, setFineStatusAction, toggleViolationAction, updateDriverAction, updateVehicleAction, voidPaymentAction } from "@/server/traffic/actions";

export type Opt = { id: string; label: string };
export type ViolationOpt = { id: string; code: string; name: string; classText: string; offenceClass: string; fineAmountFcfa: number | null; fineAmountText: string; category: string; reference: string };
type KnownVehicle = { id: string; plateNumber: string; make: string | null; model: string | null; color: string | null; vehicleType: string; status: string; insuranceExpiresAt: string | null; technicalInspectionExpiresAt: string | null };

const touch = "input min-h-11";

/* ================================================================== control (tablet / mobile first) */

export function ControlForm({ violations, stations, canPhotos }: { violations: ViolationOpt[]; stations: Opt[]; canPhotos: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [cat, setCat] = useState("");
  const [driverMode, setDriverMode] = useState<"new" | "existing">("new");
  const [when, setWhen] = useState(() => toInputDateTime(new Date()));
  const [coords, setCoords] = useState({ lat: "", lon: "" });
  const [geoState, setGeoState] = useState<"idle" | "busy" | "denied">("idle");
  const [plate, setPlate] = useState("");
  const [veh, setVeh] = useState({ type: "CAR", make: "", model: "", color: "" });
  const [known, setKnown] = useState<KnownVehicle | null>(null);

  const chosen = useMemo(() => violations.filter((v) => selected.includes(v.id)), [violations, selected]);
  const total = chosen.reduce((s, v) => s + (v.fineAmountFcfa ?? 0), 0);
  const hasDelit = chosen.some((v) => v.fineAmountFcfa === null);
  const q = filter.trim().toLowerCase();
  const visible = violations.filter((v) => (!cat || v.category === cat) && (!q || v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q)));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function locate() {
    if (!navigator.geolocation) return setGeoState("denied");
    setGeoState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) });
        setGeoState("idle");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function lookupPlate() {
    const p = plate.trim().toUpperCase();
    if (p.length < 3) return setKnown(null);
    try {
      const res = await fetch(`/api/v1/traffic/vehicles?plate=${encodeURIComponent(p)}`, { headers: { "x-requested-with": "PMS" } });
      if (!res.ok) return;
      const j = (await res.json()) as { data: KnownVehicle[] };
      const exact = j.data.find((v) => v.plateNumber === p) ?? null;
      setKnown(exact);
      if (exact) setVeh({ type: exact.vehicleType, make: exact.make ?? "", model: exact.model ?? "", color: exact.color ?? "" });
    } catch {
      /* the plate lookup is a convenience only */
    }
  }

  const expired = (d: string | null) => (d ? new Date(d) < new Date() : false);
  const categories = [...new Set(violations.map((v) => v.category))];

  return (
    <ActionForm action={recordControlAction} className="space-y-4 pb-24">
      {(s) => (
        <>
          {/* 1. circumstances */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-navy">{t("traffic.ctl.circumstances")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("traffic.ctl.when")} htmlFor="tc-when" required error={s.fieldErrors?.controlledAt}>
                <input id="tc-when" name="controlledAt" type="datetime-local" className={touch} value={when} onChange={(e) => setWhen(e.target.value)} suppressHydrationWarning required />
              </Field>
              <Field label={t("traffic.ctl.location")} htmlFor="tc-loc" required error={s.fieldErrors?.location}>
                <input id="tc-loc" name="location" className={touch} minLength={2} maxLength={300} required placeholder={t("traffic.ctl.locationPh")} autoComplete="off" />
              </Field>
              {stations.length > 1 ? (
                <Field label={t("traffic.ctl.station")} htmlFor="tc-station" required>
                  <Select id="tc-station" name="stationId" className={touch} required placeholder="—" options={stations.map((o) => ({ value: o.id, label: o.label }))} />
                </Field>
              ) : stations[0] ? (
                <input type="hidden" name="stationId" value={stations[0].id} />
              ) : null}
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t("traffic.ctl.latitude")} htmlFor="tc-lat" error={s.fieldErrors?.latitude} className="w-40">
                    <input id="tc-lat" name="latitude" inputMode="decimal" className={touch} value={coords.lat} onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))} />
                  </Field>
                  <Field label={t("traffic.ctl.longitude")} htmlFor="tc-lon" error={s.fieldErrors?.longitude} className="w-40">
                    <input id="tc-lon" name="longitude" inputMode="decimal" className={touch} value={coords.lon} onChange={(e) => setCoords((c) => ({ ...c, lon: e.target.value }))} />
                  </Field>
                  <button type="button" onClick={locate} className="min-h-11 rounded-md border border-line bg-white px-3 text-sm font-semibold text-navy hover:bg-mist">
                    {geoState === "busy" ? t("traffic.ctl.locating") : t("traffic.ctl.useMyPosition")}
                  </button>
                  {geoState === "denied" ? <span className="pb-2 text-xs text-warning">{t("traffic.ctl.geoDenied")}</span> : null}
                </div>
              </div>
            </div>
          </section>

          {/* 2. driver */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-navy">{t("traffic.ctl.driver")}</h2>
              <div className="inline-flex overflow-hidden rounded-md border border-line text-xs font-semibold" role="group" aria-label={t("traffic.ctl.driver")}>
                <button type="button" onClick={() => setDriverMode("new")} aria-pressed={driverMode === "new"} className={`min-h-9 px-3 ${driverMode === "new" ? "bg-navy text-white" : "bg-white text-slate"}`}>
                  {t("traffic.ctl.driverIdentify")}
                </button>
                <button type="button" onClick={() => setDriverMode("existing")} aria-pressed={driverMode === "existing"} className={`min-h-9 px-3 ${driverMode === "existing" ? "bg-navy text-white" : "bg-white text-slate"}`}>
                  {t("traffic.ctl.driverExisting")}
                </button>
              </div>
            </div>
            {driverMode === "existing" ? (
              <PersonPicker name="driverPersonId" label={t("traffic.driver.person")} id="tc-driver-person" error={s.fieldErrors?.driverPersonId} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("traffic.driver.lastName")} htmlFor="tc-dln" error={s.fieldErrors?.driverLastName}>
                  <input id="tc-dln" name="driverLastName" className={touch} maxLength={80} autoComplete="off" />
                </Field>
                <Field label={t("traffic.driver.firstName")} htmlFor="tc-dfn" error={s.fieldErrors?.driverFirstName}>
                  <input id="tc-dfn" name="driverFirstName" className={touch} maxLength={80} autoComplete="off" />
                </Field>
                <Field label={t("traffic.driver.cni")} htmlFor="tc-cni" hint={t("traffic.driver.cniHint")}>
                  <input id="tc-cni" name="driverCni" className={touch} maxLength={40} autoComplete="off" />
                </Field>
                <Field label={t("traffic.driver.birthDate")} htmlFor="tc-dbd" error={s.fieldErrors?.driverBirthDate}>
                  <input id="tc-dbd" name="driverBirthDate" type="date" className={touch} />
                </Field>
                <Field label={t("traffic.driver.phone")} htmlFor="tc-dph">
                  <input id="tc-dph" name="driverPhone" type="tel" className={touch} maxLength={40} />
                </Field>
                <Field label={t("traffic.driver.address")} htmlFor="tc-dad">
                  <input id="tc-dad" name="driverAddress" className={touch} maxLength={300} />
                </Field>
              </div>
            )}
            <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
              <Field label={t("traffic.driver.licenseNumber")} htmlFor="tc-lic" error={s.fieldErrors?.licenseNumber}>
                <input id="tc-lic" name="licenseNumber" className={touch} maxLength={40} autoComplete="off" />
              </Field>
              <Field label={t("traffic.driver.licenseCategory")} htmlFor="tc-cat">
                <input id="tc-cat" name="licenseCategory" className={touch} maxLength={40} placeholder="B, A, C…" />
              </Field>
              <Field label={t("traffic.driver.licenseExpiresAt")} htmlFor="tc-lexp">
                <input id="tc-lexp" name="licenseExpiresAt" type="date" className={touch} />
              </Field>
            </div>
          </section>

          {/* 3. vehicle */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-navy">{t("traffic.ctl.vehicle")}</h2>
            {known ? <input type="hidden" name="vehicleId" value={known.id} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("traffic.veh.plate")} htmlFor="tc-plate" hint={t("traffic.veh.plateHint")} error={s.fieldErrors?.plateNumber}>
                <input id="tc-plate" name="plateNumber" className={`${touch} font-mono uppercase`} maxLength={20} value={plate} onChange={(e) => setPlate(e.target.value)} onBlur={lookupPlate} autoComplete="off" placeholder="TD-1234-AB" />
              </Field>
              <Field label={t("traffic.veh.type")} htmlFor="tc-vtype">
                <Select id="tc-vtype" name="vehicleType" className={touch} value={veh.type} onChange={(e) => setVeh((v) => ({ ...v, type: e.target.value }))} options={optionsOf(TRAFFIC_VEHICLE_TYPE, locale)} />
              </Field>
              <Field label={t("traffic.veh.make")} htmlFor="tc-vmake">
                <input id="tc-vmake" name="vehicleMake" className={touch} maxLength={60} value={veh.make} onChange={(e) => setVeh((v) => ({ ...v, make: e.target.value }))} />
              </Field>
              <Field label={t("traffic.veh.model")} htmlFor="tc-vmodel">
                <input id="tc-vmodel" name="vehicleModel" className={touch} maxLength={60} value={veh.model} onChange={(e) => setVeh((v) => ({ ...v, model: e.target.value }))} />
              </Field>
              <Field label={t("traffic.veh.color")} htmlFor="tc-vcolor">
                <input id="tc-vcolor" name="vehicleColor" className={touch} maxLength={40} value={veh.color} onChange={(e) => setVeh((v) => ({ ...v, color: e.target.value }))} />
              </Field>
              <Field label={t("traffic.veh.registrationCard")} htmlFor="tc-vcard">
                <input id="tc-vcard" name="registrationCardNumber" className={touch} maxLength={40} />
              </Field>
            </div>
            {known ? (
              <div className="mt-3 space-y-2">
                <Alert tone={known.status === "ACTIVE" ? "info" : "danger"}>
                  {t("traffic.ctl.vehicleKnown")} <Badge tone={labelOf(TRAFFIC_VEHICLE_STATUS, known.status, locale).tone}>{labelOf(TRAFFIC_VEHICLE_STATUS, known.status, locale).label}</Badge>
                </Alert>
                {expired(known.insuranceExpiresAt) ? <Alert tone="warning">{t("traffic.ctl.insuranceExpired")}</Alert> : null}
                {expired(known.technicalInspectionExpiresAt) ? <Alert tone="warning">{t("traffic.ctl.inspectionExpired")}</Alert> : null}
              </div>
            ) : null}
          </section>

          {/* 4. offences */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-bold text-navy">{t("traffic.ctl.offences")}</h2>
            <p className="mb-3 mt-0.5 text-xs text-slate">{t("traffic.ctl.offencesHint")}</p>
            {s.fieldErrors?.violationIds ? <p className="mb-2 text-xs text-danger">{s.fieldErrors.violationIds}</p> : null}
            <div className="mb-3 flex flex-wrap gap-2">
              <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("traffic.ctl.offenceSearch")} aria-label={t("traffic.ctl.offenceSearch")} className={`${touch} min-w-0 flex-1`} />
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("traffic.viol.category")} className={`${touch} sm:w-64`}>
                <option value="">{t("traffic.viol.allCategories")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {labelOf(TRAFFIC_CATEGORY, c, locale).label}
                  </option>
                ))}
              </select>
            </div>
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto rounded-md border border-line" role="group" aria-label={t("traffic.ctl.offences")}>
              {visible.length === 0 ? <li className="p-4 text-sm text-slate">{t("traffic.viol.none")}</li> : null}
              {visible.map((v) => {
                const on = selected.includes(v.id);
                const cls = labelOf(TRAFFIC_OFFENCE_CLASS, v.offenceClass, locale);
                return (
                  <li key={v.id}>
                    <label className={`flex min-h-12 cursor-pointer items-start gap-3 px-3 py-2.5 ${on ? "bg-info-soft/60" : "hover:bg-mist"}`}>
                      <input type="checkbox" name="violationId" value={v.id} checked={on} onChange={() => toggle(v.id)} className="mt-1 h-5 w-5 shrink-0 accent-blue" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{v.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
                          <Badge tone={cls.tone}>{v.offenceClass === "DELIT" ? cls.label : fmtClassText(v.classText)}</Badge>
                          <span>{v.reference}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-end text-sm font-bold tabular-nums text-navy">{v.fineAmountFcfa === null ? <span className="text-xs font-semibold text-violet">{v.fineAmountText}</span> : fmtFcfa(v.fineAmountFcfa)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 5. proof + remarks */}
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-navy">{t("traffic.ctl.proof")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {canPhotos ? (
                <Field label={t("traffic.ctl.photos")} htmlFor="tc-photos" hint={t("traffic.ctl.photosHint")}>
                  <input id="tc-photos" name="photos" type="file" accept="image/*" capture="environment" multiple className="input" />
                </Field>
              ) : null}
              <Field label={t("traffic.ctl.observations")} htmlFor="tc-obs" error={s.fieldErrors?.observations} className={canPhotos ? "" : "sm:col-span-2"}>
                <textarea id="tc-obs" name="observations" rows={3} maxLength={2000} className="input" />
              </Field>
            </div>
          </section>

          {/* sticky submit bar */}
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,42,74,0.08)] backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-slate">{t("traffic.ctl.selected", { n: selected.length })}</span>
                <span className="ms-3 text-lg font-extrabold tabular-nums text-navy">{fmtFcfa(total)}</span>
                {hasDelit ? <span className="ms-2 text-xs font-semibold text-violet">{t("traffic.ctl.delitWarn")}</span> : null}
              </div>
              <SubmitButton pendingText={t("common.saving")} className="min-h-11 px-6">
                {selected.length ? t("traffic.ctl.saveWithPv") : t("traffic.ctl.saveCompliant")}
              </SubmitButton>
            </div>
          </div>
        </>
      )}
    </ActionForm>
  );
}

/* ================================================================== evidence / PV / case */

export function EvidenceForm({ controlId }: { controlId: string }) {
  const t = useT();
  return (
    <ActionForm action={attachEvidenceAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="controlId" value={controlId} />
          <Field label={t("traffic.ev.file")} htmlFor="ev-file" required error={s.fieldErrors?.file}>
            <input id="ev-file" name="file" type="file" accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf" capture="environment" className="input" required />
          </Field>
          <Field label={t("traffic.ev.caption")} htmlFor="ev-cap" error={s.fieldErrors?.caption}>
            <input id="ev-cap" name="caption" className="input" maxLength={300} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("traffic.ev.add")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CancelTicketForm({ ticketId }: { ticketId: string }) {
  const t = useT();
  return (
    <ActionForm action={cancelTicketAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="ticketId" value={ticketId} />
          <Field label={t("traffic.pv.cancelReason")} htmlFor="pv-cancel" required hint={t("traffic.pv.cancelHint")} error={s.fieldErrors?.reason}>
            <textarea id="pv-cancel" name="reason" rows={3} className="input" minLength={10} maxLength={1000} required />
          </Field>
          <SubmitButton size="sm" variant="danger" pendingText={t("common.working")}>
            {t("traffic.pv.cancel")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function OpenCaseButton({ ticketId }: { ticketId: string }) {
  const t = useT();
  return (
    <ActionButton action={openCaseFromTicketAction} fields={{ ticketId }} variant="secondary" confirm={t("traffic.pv.openCaseConfirm")} pendingText={t("common.working")}>
      {t("traffic.pv.openCase")}
    </ActionButton>
  );
}

export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
      {children}
    </button>
  );
}

/* ================================================================== fines + payments */

export function FineStatusForm({ fineId, next }: { fineId: string; next: string[] }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState(next[0] ?? "");
  if (!next.length) return <p className="text-sm text-slate">{t("traffic.fine.noTransition")}</p>;
  return (
    <ActionForm action={setFineStatusAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="fineId" value={fineId} />
          <Field label={t("traffic.fine.nextStatus")} htmlFor="fs-status" required>
            <Select id="fs-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} options={next.map((n) => ({ value: n, label: labelOf(TRAFFIC_FINE_STATUS, n, locale).label }))} />
          </Field>
          <Field label={t("traffic.fine.note")} htmlFor="fs-note" hint={t("traffic.fine.noteHint")} error={s.fieldErrors?.note}>
            <textarea id="fs-note" name="note" rows={2} className="input" maxLength={1000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("traffic.fine.apply")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PaymentForm({ fineId, remaining, allowPartial, providerName, gatewayConnected }: { fineId: string; remaining: number; allowPartial: boolean; providerName: string; gatewayConnected: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [method, setMethod] = useState("CASH");
  const needsRef = method !== "CASH" && method !== "OTHER";
  return (
    <ActionForm action={recordPaymentAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="fineId" value={fineId} />
          {!gatewayConnected ? (
            <Alert tone="info">{t("traffic.pay.manualNotice", { provider: providerName })}</Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("traffic.pay.amount")} htmlFor="pay-amount" required hint={allowPartial ? t("traffic.pay.amountHintPartial", { n: fmtFcfa(remaining) }) : t("traffic.pay.amountHintFull", { n: fmtFcfa(remaining) })} error={s.fieldErrors?.amountFcfa}>
              <input id="pay-amount" name="amountFcfa" type="number" min={1} max={remaining} step={1} defaultValue={remaining} readOnly={!allowPartial} className="input tabular-nums" required />
            </Field>
            <Field label={t("traffic.pay.method")} htmlFor="pay-method" required>
              <Select id="pay-method" name="method" value={method} onChange={(e) => setMethod(e.target.value)} options={optionsOf(TRAFFIC_PAYMENT_METHOD, locale)} />
            </Field>
            {needsRef || method === "OTHER" ? (
              <Field label={t("traffic.pay.provider")} htmlFor="pay-provider" hint={t("traffic.pay.providerHint")}>
                <input id="pay-provider" name="provider" className="input" maxLength={80} />
              </Field>
            ) : null}
            <Field label={t("traffic.pay.reference")} htmlFor="pay-ref" required={needsRef} hint={needsRef ? t("traffic.pay.referenceRequired") : t("traffic.pay.referenceOptional")} error={s.fieldErrors?.transactionReference}>
              <input id="pay-ref" name="transactionReference" className="input font-mono" maxLength={80} required={needsRef} autoComplete="off" />
            </Field>
            <Field label={t("traffic.pay.point")} htmlFor="pay-point">
              <input id="pay-point" name="paymentPoint" className="input" maxLength={120} />
            </Field>
            <Field label={t("traffic.pay.notes")} htmlFor="pay-notes">
              <input id="pay-notes" name="notes" className="input" maxLength={500} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("traffic.pay.record")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function VoidPaymentForm({ paymentId }: { paymentId: string }) {
  const t = useT();
  return (
    <ActionForm action={voidPaymentAction} className="space-y-2">
      {(s) => (
        <>
          <input type="hidden" name="paymentId" value={paymentId} />
          <label htmlFor={`void-${paymentId}`} className="label">
            {t("traffic.pay.voidReason")}
          </label>
          <textarea id={`void-${paymentId}`} name="reason" rows={2} className="input" minLength={10} maxLength={1000} required />
          {s.fieldErrors?.reason ? <p className="text-xs text-danger">{s.fieldErrors.reason}</p> : null}
          <SubmitButton size="sm" variant="danger" pendingText={t("common.working")}>
            {t("traffic.pay.void")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/* ================================================================== drivers + vehicles */

export type DriverValues = { id?: string; licenseNumber?: string; licenseCategory?: string; licenseIssuedAt?: string; licenseExpiresAt?: string; licenseIssuedBy?: string; notes?: string };

export function DriverForm({ mode, values = {} }: { mode: "create" | "edit"; values?: DriverValues }) {
  const t = useT();
  const [existing, setExisting] = useState(false);
  return (
    <ActionForm action={mode === "create" ? createDriverAction : updateDriverAction} className="space-y-4">
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          {mode === "create" ? (
            <div className="space-y-3 rounded-md border border-line p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={existing} onChange={(e) => setExisting(e.target.checked)} /> {t("traffic.driver.useExistingPerson")}
              </label>
              {existing ? (
                <PersonPicker name="personId" label={t("traffic.driver.person")} id="dr-person" error={s.fieldErrors?.personId} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("traffic.driver.lastName")} htmlFor="dr-ln" error={s.fieldErrors?.lastName}>
                    <input id="dr-ln" name="lastName" className="input" maxLength={80} />
                  </Field>
                  <Field label={t("traffic.driver.firstName")} htmlFor="dr-fn" error={s.fieldErrors?.firstName}>
                    <input id="dr-fn" name="firstName" className="input" maxLength={80} />
                  </Field>
                  <Field label={t("traffic.driver.birthDate")} htmlFor="dr-bd">
                    <input id="dr-bd" name="dateOfBirth" type="date" className="input" />
                  </Field>
                  <Field label={t("traffic.driver.cni")} htmlFor="dr-cni" hint={t("traffic.driver.cniHint")}>
                    <input id="dr-cni" name="cni" className="input" maxLength={40} />
                  </Field>
                  <Field label={t("traffic.driver.phone")} htmlFor="dr-ph">
                    <input id="dr-ph" name="phone" type="tel" className="input" maxLength={40} />
                  </Field>
                  <Field label={t("traffic.driver.address")} htmlFor="dr-ad">
                    <input id="dr-ad" name="address" className="input" maxLength={300} />
                  </Field>
                </div>
              )}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("traffic.driver.licenseNumber")} htmlFor="dr-lic" error={s.fieldErrors?.licenseNumber}>
              <input id="dr-lic" name="licenseNumber" className="input" maxLength={40} defaultValue={values.licenseNumber ?? ""} />
            </Field>
            <Field label={t("traffic.driver.licenseCategory")} htmlFor="dr-cat">
              <input id="dr-cat" name="licenseCategory" className="input" maxLength={40} defaultValue={values.licenseCategory ?? ""} />
            </Field>
            <Field label={t("traffic.driver.licenseIssuedAt")} htmlFor="dr-iss">
              <input id="dr-iss" name="licenseIssuedAt" type="date" className="input" defaultValue={values.licenseIssuedAt ?? ""} />
            </Field>
            <Field label={t("traffic.driver.licenseExpiresAt")} htmlFor="dr-exp">
              <input id="dr-exp" name="licenseExpiresAt" type="date" className="input" defaultValue={values.licenseExpiresAt ?? ""} />
            </Field>
            <Field label={t("traffic.driver.licenseIssuedBy")} htmlFor="dr-by" className="sm:col-span-2">
              <input id="dr-by" name="licenseIssuedBy" className="input" maxLength={120} defaultValue={values.licenseIssuedBy ?? ""} />
            </Field>
            <Field label={t("traffic.driver.notes")} htmlFor="dr-notes" className="sm:col-span-2">
              <textarea id="dr-notes" name="notes" rows={2} className="input" maxLength={1000} defaultValue={values.notes ?? ""} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("traffic.driver.create") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type VehicleValues = { id?: string; plateNumber?: string; registrationCardNumber?: string; make?: string; model?: string; color?: string; vehicleType?: string; year?: string; chassisNumber?: string; insuranceCompany?: string; insurancePolicyNumber?: string; insuranceExpiresAt?: string; technicalInspectionExpiresAt?: string; status?: string; notes?: string; ownerPersonId?: string };

export function VehicleForm({ mode, values = {} }: { mode: "create" | "edit"; values?: VehicleValues }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={mode === "create" ? createVehicleAction : updateVehicleAction} className="space-y-4">
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === "create" ? (
              <Field label={t("traffic.veh.plate")} htmlFor="vh-plate" required error={s.fieldErrors?.plateNumber}>
                <input id="vh-plate" name="plateNumber" className="input font-mono uppercase" maxLength={20} required placeholder="TD-1234-AB" />
              </Field>
            ) : (
              <div>
                <span className="label">{t("traffic.veh.plate")}</span>
                <p className="font-mono text-sm font-bold">{values.plateNumber}</p>
              </div>
            )}
            <Field label={t("traffic.veh.type")} htmlFor="vh-type">
              <Select id="vh-type" name="vehicleType" defaultValue={values.vehicleType ?? "CAR"} options={optionsOf(TRAFFIC_VEHICLE_TYPE, locale)} />
            </Field>
            <Field label={t("traffic.veh.make")} htmlFor="vh-make">
              <input id="vh-make" name="make" className="input" maxLength={60} defaultValue={values.make ?? ""} />
            </Field>
            <Field label={t("traffic.veh.model")} htmlFor="vh-model">
              <input id="vh-model" name="model" className="input" maxLength={60} defaultValue={values.model ?? ""} />
            </Field>
            <Field label={t("traffic.veh.color")} htmlFor="vh-color">
              <input id="vh-color" name="color" className="input" maxLength={40} defaultValue={values.color ?? ""} />
            </Field>
            <Field label={t("traffic.veh.year")} htmlFor="vh-year" error={s.fieldErrors?.year}>
              <input id="vh-year" name="year" type="number" min={1900} max={2100} className="input" defaultValue={values.year ?? ""} />
            </Field>
            <Field label={t("traffic.veh.registrationCard")} htmlFor="vh-card" error={s.fieldErrors?.registrationCardNumber}>
              <input id="vh-card" name="registrationCardNumber" className="input" maxLength={40} defaultValue={values.registrationCardNumber ?? ""} />
            </Field>
            <Field label={t("traffic.veh.chassis")} htmlFor="vh-chassis">
              <input id="vh-chassis" name="chassisNumber" className="input font-mono" maxLength={40} defaultValue={values.chassisNumber ?? ""} />
            </Field>
            <Field label={t("traffic.veh.insuranceCompany")} htmlFor="vh-ins">
              <input id="vh-ins" name="insuranceCompany" className="input" maxLength={80} defaultValue={values.insuranceCompany ?? ""} />
            </Field>
            <Field label={t("traffic.veh.insurancePolicy")} htmlFor="vh-pol">
              <input id="vh-pol" name="insurancePolicyNumber" className="input" maxLength={60} defaultValue={values.insurancePolicyNumber ?? ""} />
            </Field>
            <Field label={t("traffic.veh.insuranceExpires")} htmlFor="vh-insexp">
              <input id="vh-insexp" name="insuranceExpiresAt" type="date" className="input" defaultValue={values.insuranceExpiresAt ?? ""} />
            </Field>
            <Field label={t("traffic.veh.inspectionExpires")} htmlFor="vh-tech">
              <input id="vh-tech" name="technicalInspectionExpiresAt" type="date" className="input" defaultValue={values.technicalInspectionExpiresAt ?? ""} />
            </Field>
            <Field label={t("traffic.veh.status")} htmlFor="vh-status">
              <Select id="vh-status" name="status" defaultValue={values.status ?? "ACTIVE"} options={optionsOf(TRAFFIC_VEHICLE_STATUS, locale)} />
            </Field>
            <div className="sm:col-span-2">
              <PersonPicker name="ownerPersonId" label={t("traffic.veh.owner")} id="vh-owner" />
            </div>
            <Field label={t("traffic.driver.notes")} htmlFor="vh-notes" className="sm:col-span-2">
              <textarea id="vh-notes" name="notes" rows={2} className="input" maxLength={1000} defaultValue={values.notes ?? ""} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("traffic.veh.create") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function VehicleDocumentForm({ vehicleId }: { vehicleId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addVehicleDocumentAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("traffic.vdoc.type")} htmlFor="vd-type" required>
              <Select id="vd-type" name="type" options={optionsOf(TRAFFIC_VEHICLE_DOC_TYPE, locale)} />
            </Field>
            <Field label={t("traffic.vdoc.number")} htmlFor="vd-num">
              <input id="vd-num" name="number" className="input" maxLength={60} />
            </Field>
            <Field label={t("traffic.vdoc.issuedAt")} htmlFor="vd-iss" error={s.fieldErrors?.issuedAt}>
              <input id="vd-iss" name="issuedAt" type="date" className="input" defaultValue={toInputDate(null)} />
            </Field>
            <Field label={t("traffic.vdoc.expiresAt")} htmlFor="vd-exp" error={s.fieldErrors?.expiresAt}>
              <input id="vd-exp" name="expiresAt" type="date" className="input" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("traffic.vdoc.add")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ViolationToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useT();
  return (
    <ActionButton action={toggleViolationAction} fields={{ id, isActive: isActive ? "false" : "true" }} size="xs" variant="secondary" confirm={isActive ? t("traffic.viol.deactivateConfirm") : undefined}>
      {isActive ? t("traffic.viol.deactivate") : t("traffic.viol.activate")}
    </ActionButton>
  );
}
