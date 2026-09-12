"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { FormState } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { SCOPE_LEVEL, labelOf } from "@/lib/labels";
import { roleName } from "@/lib/i18n/catalog";

export type Refs = {
  roles: { id: string; code: string; name: string; scopeLevel: string; requiresMfa: boolean }[];
  regions: { id: string; code: string; name: string }[];
  stations: { id: string; code: string; name: string; regionId: string }[];
};

export type UserFormValues = { id?: string; username?: string; email?: string; firstName?: string; lastName?: string; phone?: string | null; roleId?: string; regionId?: string | null; stationId?: string | null };

export function UserForm({ action, refs, values = {}, mode }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; refs: Refs; values?: UserFormValues; mode: "create" | "edit" }) {
  const [roleId, setRoleId] = useState(values.roleId ?? "");
  const [regionId, setRegionId] = useState(values.regionId ?? "");
  const t = useT();
  const locale = useLocale();
  const role = refs.roles.find((r) => r.id === roleId);
  const stations = refs.stations.filter((s) => !regionId || s.regionId === regionId);
  return (
    <ActionForm action={action}>
      {(state) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("userForm.firstName")} htmlFor="firstName" required error={state.fieldErrors?.firstName}>
              <input id="firstName" name="firstName" className="input" required maxLength={60} defaultValue={values.firstName ?? ""} />
            </Field>
            <Field label={t("userForm.lastName")} htmlFor="lastName" required error={state.fieldErrors?.lastName}>
              <input id="lastName" name="lastName" className="input" required maxLength={60} defaultValue={values.lastName ?? ""} />
            </Field>
            {mode === "create" ? (
              <Field label={t("userForm.username")} htmlFor="username" required hint={t("userForm.usernameHint")} error={state.fieldErrors?.username}>
                <input id="username" name="username" className="input" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" autoComplete="off" />
              </Field>
            ) : (
              <Field label={t("userForm.username")}>
                <input className="input" value={values.username ?? ""} disabled readOnly />
              </Field>
            )}
            <Field label={t("userForm.email")} htmlFor="email" required error={state.fieldErrors?.email}>
              <input id="email" name="email" type="email" className="input" required maxLength={120} defaultValue={values.email ?? ""} />
            </Field>
            <Field label={t("userForm.phone")} htmlFor="phone" error={state.fieldErrors?.phone}>
              <input id="phone" name="phone" className="input" maxLength={30} defaultValue={values.phone ?? ""} />
            </Field>
            <Field
              label={t("userForm.role")}
              htmlFor="roleId"
              required
              hint={role ? `${t("userForm.roleScope", { scope: labelOf(SCOPE_LEVEL, role.scopeLevel, locale).label })}${role.requiresMfa ? t("userForm.roleMfa") : ""}` : t("userForm.roleHint")}
              error={state.fieldErrors?.roleId}
            >
              <Select id="roleId" name="roleId" required placeholder={t("userForm.selectRole")} value={roleId} onChange={(e) => setRoleId(e.target.value)} options={refs.roles.map((r) => ({ value: r.id, label: `${roleName(r.code, r.name, locale)} (${r.code})` }))} />
            </Field>
            <Field label={t("userForm.region")} htmlFor="regionId" hint={t("userForm.regionHint")} error={state.fieldErrors?.regionId}>
              <Select id="regionId" name="regionId" placeholder={t("userForm.noneNational")} value={regionId} onChange={(e) => setRegionId(e.target.value)} options={refs.regions.map((r) => ({ value: r.id, label: r.name }))} />
            </Field>
            <Field label={t("userForm.station")} htmlFor="stationId" hint={t("userForm.stationHint")} error={state.fieldErrors?.stationId}>
              <Select id="stationId" name="stationId" placeholder={t("userForm.none")} defaultValue={values.stationId ?? ""} options={stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} />
            </Field>
            {mode === "create" ? (
              <Field label={t("userForm.tempPassword")} htmlFor="temporaryPassword" required hint={t("userForm.tempPasswordHint")} error={state.fieldErrors?.temporaryPassword} className="sm:col-span-2">
                <input id="temporaryPassword" name="temporaryPassword" type="text" className="input font-mono" required minLength={12} maxLength={128} autoComplete="off" />
              </Field>
            ) : null}
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("userForm.create") : t("userForm.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
