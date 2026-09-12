"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { COMMUNE_TYPE, DEPARTMENT_TYPE, LOCALITY_TYPE, RANK_CATEGORY, STATION_STATUS, STATION_TYPE, optionsOf } from "@/lib/labels";
import {
  createAdminDepartmentAction,
  createCommuneAction,
  createDepartmentAction,
  createLocalityAction,
  createRankAction,
  createRegionAction,
  createStationAction,
  updateAdminDepartmentAction,
  updateCommuneAction,
  updateDepartmentAction,
  updateOrganizationAction,
  updateRankAction,
  updateRegionAction,
  updateStationAction,
} from "@/server/org/actions";

type Opt = { id: string; label: string };
export type TerritoryRefs = {
  regions: Opt[];
  adminDepartments: { id: string; label: string; regionId: string }[];
  communes: { id: string; label: string; adminDepartmentId: string }[];
  stations: { id: string; label: string; regionId: string; type: string }[];
};

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

export function AdminDepartmentForm({ regionId, department }: { regionId: string; department?: { id: string; code: string; name: string; capital: string | null; isActive: boolean } }) {
  const t = useT();
  const p = department ? `ad-${department.id}-` : "ad-new-";
  return (
    <ActionForm action={department ? updateAdminDepartmentAction : createAdminDepartmentAction} className="space-y-3">
      {(s) => (
        <>
          {department ? <input type="hidden" name="id" value={department.id} /> : <input type="hidden" name="regionId" value={regionId} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={16} defaultValue={department?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={120} defaultValue={department?.name ?? ""} />
            </Field>
            <Field label={t("terr.capital")} htmlFor={`${p}cap`}>
              <input id={`${p}cap`} name="capital" className="input" maxLength={100} defaultValue={department?.capital ?? ""} />
            </Field>
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

export function CommuneForm({ adminDepartmentId, commune }: { adminDepartmentId: string; commune?: { id: string; code: string; name: string; type: string; isActive: boolean } }) {
  const t = useT();
  const locale = useLocale();
  const p = commune ? `cm-${commune.id}-` : "cm-new-";
  return (
    <ActionForm action={commune ? updateCommuneAction : createCommuneAction} className="space-y-3">
      {(s) => (
        <>
          {commune ? <input type="hidden" name="id" value={commune.id} /> : <input type="hidden" name="adminDepartmentId" value={adminDepartmentId} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={20} defaultValue={commune?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={120} defaultValue={commune?.name ?? ""} />
            </Field>
            <Field label={t("terr.col.type")} htmlFor={`${p}type`} required>
              <Select id={`${p}type`} name="type" defaultValue={commune?.type ?? "COMMUNE"} options={optionsOf(COMMUNE_TYPE, locale)} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={commune?.isActive ?? true} /> {t("org.isActive")}
            </label>
          </div>
          <SubmitButton size="sm" pendingText={commune ? t("common.saving") : t("common.creating")}>
            {commune ? t("common.save") : t("common.create")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function LocalityForm({ communeId }: { communeId: string }) {
  const t = useT();
  const locale = useLocale();
  const p = `lc-${communeId}-`;
  return (
    <ActionForm action={createLocalityAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="communeId" value={communeId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={120} />
            </Field>
            <Field label={t("terr.col.type")} htmlFor={`${p}type`} required>
              <Select id={`${p}type`} name="type" defaultValue="QUARTIER" options={optionsOf(LOCALITY_TYPE, locale)} />
            </Field>
            <Field label={t("org.code")} htmlFor={`${p}code`}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" maxLength={24} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.creating")}>
            {t("common.create")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type StationFormValues = {
  id: string;
  regionId: string;
  adminDepartmentId: string | null;
  communeId: string | null;
  localityId: string | null;
  parentId: string | null;
  code: string;
  name: string;
  type: string;
  status: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  commanderId: string | null;
};

export function StationForm({
  station,
  refs,
  commanders,
  localities = [],
  defaults,
}: {
  station?: StationFormValues;
  refs: TerritoryRefs;
  commanders?: Opt[];
  localities?: Opt[];
  defaults?: { regionId?: string; adminDepartmentId?: string; parentId?: string; type?: string };
}) {
  const t = useT();
  const locale = useLocale();
  const [regionId, setRegionId] = useState(station?.regionId ?? defaults?.regionId ?? (refs.regions.length === 1 ? refs.regions[0].id : ""));
  const [adminDepartmentId, setAdminDepartmentId] = useState(station?.adminDepartmentId ?? defaults?.adminDepartmentId ?? "");
  const departments = refs.adminDepartments.filter((d) => d.regionId === regionId);
  const communes = refs.communes.filter((c) => c.adminDepartmentId === adminDepartmentId);
  const parents = refs.stations.filter((s) => s.regionId === regionId && s.id !== station?.id);
  const p = station ? `st-${station.id}-` : "st-new-";
  return (
    <ActionForm action={station ? updateStationAction : createStationAction}>
      {(s) => (
        <>
          {station ? <input type="hidden" name="id" value={station.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("station.region")} htmlFor={`${p}region`} required error={s.fieldErrors?.regionId}>
              <Select
                id={`${p}region`}
                name="regionId"
                required
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setAdminDepartmentId("");
                }}
                options={refs.regions.map((r) => ({ value: r.id, label: r.label }))}
                placeholder={refs.regions.length > 1 ? "—" : undefined}
              />
            </Field>
            <Field label={t("station.type")} htmlFor={`${p}type`} required>
              <Select id={`${p}type`} name="type" defaultValue={station?.type ?? defaults?.type ?? "STATION"} options={optionsOf(STATION_TYPE, locale)} />
            </Field>
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={16} defaultValue={station?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={120} defaultValue={station?.name ?? ""} />
            </Field>
            <Field label={t("station.status")} htmlFor={`${p}status`} required>
              <Select id={`${p}status`} name="status" defaultValue={station?.status ?? "ACTIVE"} options={optionsOf(STATION_STATUS, locale)} />
            </Field>
            <Field label={t("station.parent")} htmlFor={`${p}parent`} error={s.fieldErrors?.parentId}>
              <Select id={`${p}parent`} name="parentId" defaultValue={station?.parentId ?? defaults?.parentId ?? ""} placeholder={t("station.noParent")} options={parents.map((x) => ({ value: x.id, label: x.label }))} />
            </Field>
            <Field label={t("station.adminDepartment")} htmlFor={`${p}dept`}>
              <Select id={`${p}dept`} name="adminDepartmentId" value={adminDepartmentId} onChange={(e) => setAdminDepartmentId(e.target.value)} placeholder={t("station.unset")} options={departments.map((d) => ({ value: d.id, label: d.label }))} />
            </Field>
            <Field label={t("station.commune")} htmlFor={`${p}commune`}>
              <Select id={`${p}commune`} name="communeId" defaultValue={station?.communeId ?? ""} placeholder={t("station.unset")} options={communes.map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
            {localities.length ? (
              <Field label={t("station.locality")} htmlFor={`${p}loc`}>
                <Select id={`${p}loc`} name="localityId" defaultValue={station?.localityId ?? ""} placeholder={t("station.unset")} options={localities.map((l) => ({ value: l.id, label: l.label }))} />
              </Field>
            ) : null}
            <Field label={t("station.address")} htmlFor={`${p}address`}>
              <input id={`${p}address`} name="address" className="input" maxLength={200} defaultValue={station?.address ?? ""} />
            </Field>
            <Field label={t("station.city")} htmlFor={`${p}city`}>
              <input id={`${p}city`} name="city" className="input" maxLength={100} defaultValue={station?.city ?? ""} />
            </Field>
            <Field label={t("station.phone")} htmlFor={`${p}phone`}>
              <input id={`${p}phone`} name="phone" className="input" maxLength={30} defaultValue={station?.phone ?? ""} />
            </Field>
            <Field label={t("station.email")} htmlFor={`${p}email`} error={s.fieldErrors?.email}>
              <input id={`${p}email`} name="email" type="email" className="input" maxLength={120} defaultValue={station?.email ?? ""} />
            </Field>
            <Field label={t("station.latitude")} htmlFor={`${p}lat`}>
              <input id={`${p}lat`} name="latitude" className="input" inputMode="decimal" maxLength={20} defaultValue={station?.latitude ?? ""} />
            </Field>
            <Field label={t("station.longitude")} htmlFor={`${p}lng`}>
              <input id={`${p}lng`} name="longitude" className="input" inputMode="decimal" maxLength={20} defaultValue={station?.longitude ?? ""} />
            </Field>
            {station && commanders ? (
              <Field label={t("station.commander")} htmlFor={`${p}cmd`} className="sm:col-span-2">
                <Select id={`${p}cmd`} name="commanderId" defaultValue={station.commanderId ?? ""} placeholder={t("station.noCommander")} options={commanders.map((c) => ({ value: c.id, label: c.label }))} />
              </Field>
            ) : null}
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
