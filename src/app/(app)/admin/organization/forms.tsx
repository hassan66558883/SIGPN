"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { DEPARTMENT_TYPE, RANK_CATEGORY, STATION_TYPE, optionsOf } from "@/lib/labels";
import { createDepartmentAction, createRankAction, createRegionAction, createStationAction, updateDepartmentAction, updateOrganizationAction, updateRankAction, updateRegionAction, updateStationAction } from "@/server/org/actions";

type Opt = { id: string; label: string };

export function OrganizationForm({ org }: { org: { id: string; name: string; shortName: string | null; description: string | null } }) {
  const t = useT();
  return (
    <ActionForm action={updateOrganizationAction}>
      {(s) => (
        <>
          <input type="hidden" name="id" value={org.id} />
          <Field label={t("org.name")} htmlFor="org-name" required error={s.fieldErrors?.name}>
            <input id="org-name" name="name" className="input" required maxLength={120} defaultValue={org.name} />
          </Field>
          <Field label={t("org.shortName")} htmlFor="org-short">
            <input id="org-short" name="shortName" className="input" maxLength={30} defaultValue={org.shortName ?? ""} />
          </Field>
          <Field label={t("org.description")} htmlFor="org-desc">
            <textarea id="org-desc" name="description" className="input" rows={3} maxLength={500} defaultValue={org.description ?? ""} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RegionForm({ region }: { region?: { id: string; code: string; name: string; capital: string | null; isActive: boolean } }) {
  const t = useT();
  return (
    <ActionForm action={region ? updateRegionAction : createRegionAction}>
      {(s) => (
        <>
          {region ? <input type="hidden" name="id" value={region.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("org.code")} htmlFor="rg-code" required error={s.fieldErrors?.code}>
              <input id="rg-code" name="code" className="input font-mono uppercase" required maxLength={12} defaultValue={region?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor="rg-name" required error={s.fieldErrors?.name}>
              <input id="rg-name" name="name" className="input" required maxLength={100} defaultValue={region?.name ?? ""} />
            </Field>
            <Field label={t("region.capital")} htmlFor="rg-capital">
              <input id="rg-capital" name="capital" className="input" maxLength={100} defaultValue={region?.capital ?? ""} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={region?.isActive ?? true} /> {t("org.isActive")}
            </label>
          </div>
          <SubmitButton pendingText={region ? t("common.saving") : t("common.creating")}>{region ? t("common.save") : t("common.create")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function StationForm({
  station,
  regions,
  commanders,
  defaultRegionId,
}: {
  station?: { id: string; regionId: string; code: string; name: string; type: string; address: string | null; city: string | null; phone: string | null; email: string | null; latitude: number | null; longitude: number | null; commanderId: string | null; isActive: boolean };
  regions: Opt[];
  commanders?: Opt[];
  defaultRegionId?: string;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={station ? updateStationAction : createStationAction}>
      {(s) => (
        <>
          {station ? <input type="hidden" name="id" value={station.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("station.region")} htmlFor="st-region" required error={s.fieldErrors?.regionId}>
              <Select id="st-region" name="regionId" required defaultValue={station?.regionId ?? defaultRegionId ?? ""} options={regions.map((r) => ({ value: r.id, label: r.label }))} placeholder={regions.length > 1 ? "—" : undefined} />
            </Field>
            <Field label={t("station.type")} htmlFor="st-type" required>
              <Select id="st-type" name="type" defaultValue={station?.type ?? "STATION"} options={optionsOf(STATION_TYPE, locale)} />
            </Field>
            <Field label={t("org.code")} htmlFor="st-code" required error={s.fieldErrors?.code}>
              <input id="st-code" name="code" className="input font-mono uppercase" required maxLength={16} defaultValue={station?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor="st-name" required error={s.fieldErrors?.name}>
              <input id="st-name" name="name" className="input" required maxLength={120} defaultValue={station?.name ?? ""} />
            </Field>
            <Field label={t("station.address")} htmlFor="st-address">
              <input id="st-address" name="address" className="input" maxLength={200} defaultValue={station?.address ?? ""} />
            </Field>
            <Field label={t("station.city")} htmlFor="st-city">
              <input id="st-city" name="city" className="input" maxLength={100} defaultValue={station?.city ?? ""} />
            </Field>
            <Field label={t("station.phone")} htmlFor="st-phone">
              <input id="st-phone" name="phone" className="input" maxLength={30} defaultValue={station?.phone ?? ""} />
            </Field>
            <Field label={t("station.email")} htmlFor="st-email" error={s.fieldErrors?.email}>
              <input id="st-email" name="email" type="email" className="input" maxLength={120} defaultValue={station?.email ?? ""} />
            </Field>
            <Field label={t("station.latitude")} htmlFor="st-lat">
              <input id="st-lat" name="latitude" className="input" inputMode="decimal" maxLength={20} defaultValue={station?.latitude ?? ""} />
            </Field>
            <Field label={t("station.longitude")} htmlFor="st-lng">
              <input id="st-lng" name="longitude" className="input" inputMode="decimal" maxLength={20} defaultValue={station?.longitude ?? ""} />
            </Field>
            {station && commanders ? (
              <Field label={t("station.commander")} htmlFor="st-cmd" className="sm:col-span-2">
                <Select id="st-cmd" name="commanderId" defaultValue={station.commanderId ?? ""} placeholder={t("station.noCommander")} options={commanders.map((c) => ({ value: c.id, label: c.label }))} />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={station?.isActive ?? true} /> {t("org.isActive")}
            </label>
          </div>
          <SubmitButton pendingText={station ? t("common.saving") : t("common.creating")}>{station ? t("common.save") : t("common.create")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DepartmentForm({ stationId, department, heads }: { stationId: string; department?: { id: string; code: string; name: string; type: string; headId: string | null; isActive: boolean }; heads: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  const p = department ? `dp-${department.id}-` : "dp-new-";
  return (
    <ActionForm action={department ? updateDepartmentAction : createDepartmentAction} className="space-y-3">
      {(s) => (
        <>
          {department ? <input type="hidden" name="id" value={department.id} /> : null}
          <input type="hidden" name="stationId" value={stationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("dept.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={16} defaultValue={department?.code ?? ""} />
            </Field>
            <Field label={t("dept.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={120} defaultValue={department?.name ?? ""} />
            </Field>
            <Field label={t("dept.type")} htmlFor={`${p}type`} required>
              <Select id={`${p}type`} name="type" defaultValue={department?.type ?? "INVESTIGATION"} options={optionsOf(DEPARTMENT_TYPE, locale)} />
            </Field>
            {department ? (
              <Field label={t("dept.head")} htmlFor={`${p}head`}>
                <Select id={`${p}head`} name="headId" defaultValue={department.headId ?? ""} placeholder={t("dept.noHead")} options={heads.map((h) => ({ value: h.id, label: h.label }))} />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={department?.isActive ?? true} /> {t("org.isActive")}
            </label>
          </div>
          <SubmitButton size="sm" pendingText={department ? t("common.saving") : t("common.creating")}>
            {department ? t("common.save") : t("common.create")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RankForm({ rank }: { rank?: { id: string; code: string; name: string; level: number; category: string; isActive: boolean } }) {
  const t = useT();
  const locale = useLocale();
  const p = rank ? `rk-${rank.id}-` : "rk-new-";
  return (
    <ActionForm action={rank ? updateRankAction : createRankAction} className="space-y-3">
      {(s) => (
        <>
          {rank ? <input type="hidden" name="id" value={rank.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={12} defaultValue={rank?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={80} defaultValue={rank?.name ?? ""} />
            </Field>
            <Field label={t("rank.level")} htmlFor={`${p}level`} required error={s.fieldErrors?.level}>
              <input id={`${p}level`} name="level" type="number" min={1} max={99} className="input" required defaultValue={rank?.level ?? 1} />
            </Field>
            <Field label={t("rank.category")} htmlFor={`${p}cat`} required>
              <Select id={`${p}cat`} name="category" defaultValue={rank?.category ?? "CONSTABLE"} options={optionsOf(RANK_CATEGORY, locale)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={rank?.isActive ?? true} /> {t("org.isActive")}
            </label>
          </div>
          <SubmitButton size="sm" pendingText={rank ? t("common.saving") : t("common.creating")}>
            {rank ? t("common.save") : t("common.create")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
