"use client";

import { useState, type ReactNode } from "react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { Alert, Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { CASH_DEPOSIT_METHOD, optionsOf } from "@/lib/labels";
import { toInputDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { blockRegisterAction, closeRegisterAction, createDepositAction, discrepancyAction, openRegisterAction, reconciliationAction, respondDepositAction, reviewDepositAction, verifyClosureAction } from "@/server/traffic/cash-actions";

/* ================================================================== register */

export function OpenRegisterForm() {
  const t = useT();
  return (
    <ActionForm action={openRegisterAction} className="space-y-3">
      {(s) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("cash.reg.openingBalance")} htmlFor="cr-open" hint={t("cash.reg.openingBalanceHint")} error={s.fieldErrors?.openingBalanceFcfa}>
              <input id="cr-open" name="openingBalanceFcfa" type="number" min={0} step={1} defaultValue={0} className="input tabular-nums" />
            </Field>
            <Field label={t("cash.reg.notes")} htmlFor="cr-notes">
              <input id="cr-notes" name="notes" maxLength={500} className="input" />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.working")}>{t("cash.reg.open")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CloseRegisterForm({ registerId, collected, count }: { registerId: string; collected: number; count: number }) {
  const t = useT();
  return (
    <ActionForm action={closeRegisterAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="registerId" value={registerId} />
          <Alert tone="warning">{t("cash.reg.closeWarning", { n: count, amount: fmtFcfa(collected) })}</Alert>
          <Field label={t("cash.reg.notes")} htmlFor="cr-close-notes" error={s.fieldErrors?.notes}>
            <input id="cr-close-notes" name="notes" maxLength={500} className="input" />
          </Field>
          <SubmitButton variant="danger" pendingText={t("common.working")}>
            {t("cash.reg.close")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function BlockRegisterForm({ registerId, blocked }: { registerId: string; blocked: boolean }) {
  const t = useT();
  return (
    <ActionForm action={blockRegisterAction} className="space-y-2">
      {(s) => (
        <>
          <input type="hidden" name="registerId" value={registerId} />
          <input type="hidden" name="op" value={blocked ? "unblock" : "block"} />
          <label className="label" htmlFor={`blk-${registerId}`}>
            {t("cash.reg.blockReason")}
          </label>
          <textarea id={`blk-${registerId}`} name="reason" rows={2} minLength={10} maxLength={1000} required className="input" />
          {s.fieldErrors?.reason ? <p className="text-xs text-danger">{s.fieldErrors.reason}</p> : null}
          <SubmitButton size="sm" variant={blocked ? "primary" : "danger"} pendingText={t("common.working")}>
            {blocked ? t("cash.reg.unblock") : t("cash.reg.block")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function VerifyClosureButton({ collectionId }: { collectionId: string }) {
  const t = useT();
  return (
    <ActionButton action={verifyClosureAction} fields={{ collectionId }} pendingText={t("common.working")}>
      {t("cash.col.verify")}
    </ActionButton>
  );
}

/* ================================================================== deposit */

export function DepositForm({ collectionId, remaining, allowPartial }: { collectionId: string; remaining: number; allowPartial: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [method, setMethod] = useState("BANK");
  const [amount, setAmount] = useState(remaining);
  const needsSlip = method === "BANK" || method === "TREASURY";
  const needsRef = method === "BANK" || method === "MOBILE_MONEY";
  const shortfall = amount < remaining;
  return (
    <ActionForm action={createDepositAction} className="space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="collectionId" value={collectionId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("cash.dep.amount")} htmlFor="dp-amount" required hint={allowPartial ? t("cash.dep.amountHintPartial", { n: fmtFcfa(remaining) }) : t("cash.dep.amountHintFull", { n: fmtFcfa(remaining) })} error={s.fieldErrors?.amountDepositedFcfa}>
              <input id="dp-amount" name="amountDepositedFcfa" type="number" min={1} max={remaining} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input tabular-nums" required />
            </Field>
            <Field label={t("cash.dep.method")} htmlFor="dp-method" required>
              <Select id="dp-method" name="method" value={method} onChange={(e) => setMethod(e.target.value)} options={optionsOf(CASH_DEPOSIT_METHOD, locale)} />
            </Field>
            <Field label={t("cash.dep.slipNumber")} htmlFor="dp-slip" required={needsSlip} hint={t("cash.dep.slipHint")} error={s.fieldErrors?.slipNumber}>
              <input id="dp-slip" name="slipNumber" maxLength={80} required={needsSlip} className="input font-mono" autoComplete="off" />
            </Field>
            <Field label={t("cash.dep.reference")} htmlFor="dp-ref" required={needsRef} hint={t("cash.dep.referenceHint")} error={s.fieldErrors?.reference}>
              <input id="dp-ref" name="reference" maxLength={80} required={needsRef} className="input font-mono" autoComplete="off" />
            </Field>
            <Field label={t("cash.dep.recipient")} htmlFor="dp-rcp" hint={t("cash.dep.recipientHint")}>
              <input id="dp-rcp" name="recipient" maxLength={160} className="input" />
            </Field>
            <Field label={t("cash.dep.date")} htmlFor="dp-date">
              <input id="dp-date" name="depositedAt" type="datetime-local" defaultValue={toInputDateTime(new Date())} className="input" />
            </Field>
          </div>
          {shortfall && !allowPartial ? <Alert tone="warning">{t("cash.dep.shortfallWarning", { n: fmtFcfa(remaining - amount) })}</Alert> : null}
          {shortfall && allowPartial ? <Alert tone="info">{t("cash.dep.partialInfo", { n: fmtFcfa(remaining - amount) })}</Alert> : null}
          <Field label={t("cash.dep.observations")} htmlFor="dp-obs" required={shortfall && !allowPartial} error={s.fieldErrors?.observations}>
            <textarea id="dp-obs" name="observations" rows={2} maxLength={1000} className="input" />
          </Field>
          <Field label={t("cash.dep.attachment")} htmlFor="dp-file" hint={t("cash.dep.attachmentHint")}>
            <input id="dp-file" name="attachment" type="file" accept="image/*,application/pdf" className="input" />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("cash.dep.submit")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

function NoteForm({ action, fields, label, button, variant = "primary", required, minLength = 5, field = "note", fileField }: { action: (p: never, f: FormData) => Promise<never>; fields: Record<string, string>; label: string; button: string; variant?: "primary" | "danger" | "secondary"; required?: boolean; minLength?: number; field?: string; fileField?: boolean }): ReactNode {
  const t = useT();
  return (
    <ActionForm action={action as never} className="space-y-2">
      {(s) => (
        <>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="label" htmlFor={`nf-${Object.values(fields).join("-")}`}>
            {label}
          </label>
          <textarea id={`nf-${Object.values(fields).join("-")}`} name={field} rows={2} maxLength={2000} minLength={required ? minLength : undefined} required={required} className="input" />
          {s.fieldErrors?.[field] ? <p className="text-xs text-danger">{s.fieldErrors[field]}</p> : null}
          {fileField ? <input name="attachment" type="file" accept="image/*,application/pdf" className="input" aria-label={t("cash.dep.attachment")} /> : null}
          <SubmitButton size="sm" variant={variant} pendingText={t("common.working")}>
            {button}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DepositReviewPanel({ depositId, status, canReview, canValidate, isOwner, selfBlocked }: { depositId: string; status: string; canReview: boolean; canValidate: boolean; isOwner: boolean; selfBlocked: boolean }) {
  const t = useT();
  const open = status === "SUBMITTED" || status === "VERIFIED" || status === "JUSTIFICATION_REQUESTED";
  return (
    <div className="grid gap-5">
      {selfBlocked && (canReview || canValidate) && open ? <Alert tone="info">{t("cash.dep.selfBlocked")}</Alert> : null}
      {canReview && !selfBlocked && status === "SUBMITTED" ? (
        <ActionForm action={reviewDepositAction} className="space-y-2">
          <input type="hidden" name="depositId" value={depositId} />
          <input type="hidden" name="op" value="verify" />
          <p className="text-sm text-slate">{t("cash.dep.verifyHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("cash.dep.verify")}
          </SubmitButton>
        </ActionForm>
      ) : null}
      {canValidate && !selfBlocked && status === "VERIFIED" ? (
        <ActionForm action={reviewDepositAction} className="space-y-2">
          <input type="hidden" name="depositId" value={depositId} />
          <input type="hidden" name="op" value="validate" />
          <p className="text-sm text-slate">{t("cash.dep.validateHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("cash.dep.validate")}
          </SubmitButton>
        </ActionForm>
      ) : null}
      {canReview && (status === "SUBMITTED" || status === "VERIFIED") ? <NoteForm action={reviewDepositAction as never} fields={{ depositId, op: "request_justification" }} label={t("cash.dep.justificationAsk")} button={t("cash.dep.requestJustification")} variant="secondary" required /> : null}
      {canReview && open ? <NoteForm action={reviewDepositAction as never} fields={{ depositId, op: "reject" }} label={t("cash.dep.rejectReason")} button={t("cash.dep.reject")} variant="danger" required minLength={10} /> : null}
      {isOwner && status === "JUSTIFICATION_REQUESTED" ? <NoteForm action={respondDepositAction as never} fields={{ depositId }} label={t("cash.dep.respond")} button={t("cash.dep.respondSend")} required fileField /> : null}
    </div>
  );
}

/* ================================================================== reconciliation, discrepancy */

export function ReconciliationPanel({ collectionId, status, canDeclare, canFinalize }: { collectionId: string; status: string; canDeclare: boolean; canFinalize: boolean }) {
  const t = useT();
  if (status === "VALIDATED") return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {canFinalize ? (
        <ActionForm action={reconciliationAction} className="space-y-2">
          <input type="hidden" name="collectionId" value={collectionId} />
          <input type="hidden" name="op" value="finalize" />
          <p className="text-sm text-slate">{t("cash.rec.finalizeHint")}</p>
          <input name="note" maxLength={1000} className="input" placeholder={t("cash.rec.note")} aria-label={t("cash.rec.note")} />
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("cash.rec.finalize")}
          </SubmitButton>
        </ActionForm>
      ) : null}
      {canDeclare ? (
        <ActionForm action={reconciliationAction} className="space-y-2">
          <input type="hidden" name="collectionId" value={collectionId} />
          <input type="hidden" name="op" value="declare_gap" />
          <p className="text-sm text-slate">{t("cash.rec.declareHint")}</p>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.working")}>
            {t("cash.rec.declare")}
          </SubmitButton>
        </ActionForm>
      ) : null}
      {status !== "REJECTED" ? <NoteForm action={reconciliationAction as never} fields={{ collectionId, op: "reject" }} label={t("cash.rec.rejectReason")} button={t("cash.rec.reject")} variant="danger" required minLength={10} /> : null}
    </div>
  );
}

export function DiscrepancyPanel({ id, status, canJustify, canDecide, isSelf, reason, justification }: { id: string; status: string; canJustify: boolean; canDecide: boolean; isSelf: boolean; reason: string; justification: string }) {
  const t = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {canJustify && (status === "OPEN" || status === "REJECTED") ? (
        <ActionForm action={discrepancyAction} className="space-y-2 md:col-span-2">
          {(s) => (
            <>
              <input type="hidden" name="discrepancyId" value={id} />
              <input type="hidden" name="op" value="justify" />
              <Field label={t("cash.disc.reason")} htmlFor="dc-reason" required error={s.fieldErrors?.reason}>
                <input id="dc-reason" name="reason" defaultValue={reason} maxLength={500} required className="input" />
              </Field>
              <Field label={t("cash.disc.justification")} htmlFor="dc-just" required error={s.fieldErrors?.text}>
                <textarea id="dc-just" name="text" rows={3} defaultValue={justification} maxLength={2000} required minLength={10} className="input" />
              </Field>
              <Field label={t("cash.dep.attachment")} htmlFor="dc-file">
                <input id="dc-file" name="attachment" type="file" accept="image/*,application/pdf" className="input" />
              </Field>
              <SubmitButton size="sm" pendingText={t("common.working")}>
                {t("cash.disc.justify")}
              </SubmitButton>
            </>
          )}
        </ActionForm>
      ) : null}
      {canDecide && status === "JUSTIFIED" && !isSelf ? (
        <ActionForm action={discrepancyAction} className="space-y-2">
          <input type="hidden" name="discrepancyId" value={id} />
          <input type="hidden" name="op" value="validate" />
          <p className="text-sm text-slate">{t("cash.disc.validateHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("cash.disc.validate")}
          </SubmitButton>
        </ActionForm>
      ) : null}
      {canDecide && (status === "JUSTIFIED" || status === "OPEN") ? <NoteForm action={discrepancyAction as never} fields={{ discrepancyId: id, op: "reject" }} label={t("cash.disc.rejectReason")} button={t("cash.disc.reject")} variant="danger" required minLength={10} field="text" /> : null}
    </div>
  );
}
