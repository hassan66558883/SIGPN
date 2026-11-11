import "server-only";
import type { Actor } from "@/server/auth/dal";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ARREST_AUTHORITY, ARREST_STATUS, CASE_DISPOSITION, CASE_ROLE, CASE_STATUS, COMPLAINT_STATUS, DETENTION_END_REASON, DETENTION_LOG_TYPE, DETENTION_STATUS, INCIDENT_STATUS, INCIDENT_TYPE, OFFENSE_CATEGORY, PARTY_ROLE, PARTY_STATUS, PRIORITY, SEVERITY, WARRANT_STATUS, WARRANT_TYPE, labelOf, type LabelMap } from "@/lib/labels";
import { listComplaints } from "@/server/complaints/queries";
import { getComplaint } from "@/server/complaints/service";
import { listCases } from "@/server/cases/queries";
import { getCase } from "@/server/cases/service";
import { getWarrant, listWarrants } from "@/server/warrants/service";
import { getArrest, listArrests } from "@/server/arrests/service";
import { getDetention, listDetentions } from "@/server/detention/service";
import { listIncidents } from "@/server/ops/queries";
import { getIncident } from "@/server/ops/service";
import type { Permission } from "@/server/rbac/permissions";

/**
 * PDF export of lists and records. The PDF is built from the SAME functions as the screens (same territorial scope, same
 * confidentiality rules): an export can never show more than the screen. French only (the PDF font has no Arabic glyphs).
 */
export const MAX_EXPORT_ROWS = 500;
const PAGE = 100;

export type Col = { h: string; w: number };
export type Section = { title: string; fields: [string, string][] };
export type Sheet = { number: string; title: string; subtitle: string; sections: Section[]; tables: { title: string; cols: Col[]; rows: string[][] }[] };
export type Query = Record<string, string | undefined>;
export type ExportModule = {
  key: string;
  title: string;
  view: Permission;
  cols: Col[];
  list: (actor: Actor, q: Query, page: number) => Promise<{ items: unknown[]; total: number }>;
  row: (item: any) => string[];
  sheet: (actor: Actor, id: string) => Promise<Sheet>;
};

const L = (map: LabelMap, k: string | null | undefined) => labelOf(map, k, "fr").label;
const name = (p: { firstName?: string | null; lastName?: string | null } | null | undefined) => (p ? `${p.lastName ?? ""} ${p.firstName ?? ""}`.trim() || "—" : "—");
const D = (v: Date | string | null | undefined) => (v ? fmtDate(v, "fr") : "—");
const DT = (v: Date | string | null | undefined) => (v ? fmtDateTime(v, "fr") : "—");
const T = (v: string | null | undefined) => (v && v.trim() ? v : "—");

export const MODULES: Record<string, ExportModule> = {
  complaints: {
    key: "complaints", title: "Liste des plaintes", view: "complaints:view",
    cols: [{ h: "N°", w: 12 }, { h: "Titre", w: 26 }, { h: "Catégorie", w: 14 }, { h: "Priorité", w: 9 }, { h: "Statut", w: 11 }, { h: "Reçue le", w: 12 }, { h: "Commissariat", w: 16 }],
    list: (a, q, page) => listComplaints(a, { q: q.q, status: q.status as never, category: q.category as never, priority: q.priority as never, stationId: q.stationId, mine: q.mine === "1", page, pageSize: PAGE }),
    row: (c) => [c.number, c.title, L(OFFENSE_CATEGORY, c.category), L(PRIORITY, c.priority), L(COMPLAINT_STATUS, c.status), D(c.receivedAt), c.station?.name ?? "—"],
    sheet: async (a, id) => {
      const c = await getComplaint(a, id);
      return {
        number: c.number, title: c.title, subtitle: "Fiche de plainte",
        sections: [
          { title: "Plainte", fields: [["Numéro", c.number], ["Statut", L(COMPLAINT_STATUS, c.status)], ["Catégorie", L(OFFENSE_CATEGORY, c.category)], ["Priorité", L(PRIORITY, c.priority)], ["Reçue le", DT(c.receivedAt)], ["Date des faits", DT(c.incidentAt)], ["Lieu", T(c.locationText)], ["Commissariat", c.station?.name ?? "—"]] },
          { title: "Parties", fields: [["Plaignant", c.isAnonymous ? "Plainte anonyme" : name(c.complainant)], ["Enregistrée par", name(c.createdBy)], ["Examinée par", name(c.reviewedBy)], ["Affectée à", name(c.assignedTo)], ["Affaire liée", c.case?.number ?? "—"]] },
          { title: "Faits", fields: [["Description", c.description]] },
          { title: "Traitement", fields: [["Observations de l'examen", T(c.reviewNotes)], ["Motif de clôture", T(c.closureReason)], ["Clôturée le", DT(c.closedAt)]] },
        ],
        tables: [],
      };
    },
  },
  cases: {
    key: "cases", title: "Liste des affaires", view: "cases:view",
    cols: [{ h: "N°", w: 12 }, { h: "Titre", w: 26 }, { h: "Catégorie", w: 14 }, { h: "Priorité", w: 9 }, { h: "Statut", w: 12 }, { h: "Responsable", w: 14 }, { h: "Commissariat", w: 14 }],
    list: (a, q, page) => listCases(a, { q: q.q, status: q.status as never, category: q.category as never, priority: q.priority as never, stationId: q.stationId, mine: q.mine === "1", page, pageSize: PAGE }),
    row: (c) => [c.number, c.title + (c.isSensitive ? " (sensible)" : ""), L(OFFENSE_CATEGORY, c.category), L(PRIORITY, c.priority), L(CASE_STATUS, c.status), name(c.lead), c.station?.name ?? "—"],
    sheet: async (a, id) => {
      const k = await getCase(a, id);
      return {
        number: k.number, title: k.title, subtitle: k.isSensitive ? "Fiche d'affaire — SENSIBLE" : "Fiche d'affaire",
        sections: [
          { title: "Affaire", fields: [["Numéro", k.number], ["Statut", L(CASE_STATUS, k.status)], ["Catégorie", L(OFFENSE_CATEGORY, k.category)], ["Priorité", L(PRIORITY, k.priority)], ["Faits survenus le", DT(k.occurredAt)], ["Signalée le", DT(k.reportedAt)], ["Lieu", T(k.locationText)], ["Commissariat", k.station?.name ?? "—"], ["Plainte d'origine", k.complaint?.number ?? "—"]] },
          { title: "Équipe", fields: [["Responsable", name(k.lead)], ["Superviseur", name(k.supervisor)], ["Ouverte par", name(k.createdBy)]] },
          { title: "Description", fields: [["Description", k.description ?? "—"]] },
          { title: "Issue", fields: [["Issue", k.disposition ? L(CASE_DISPOSITION, k.disposition) : "—"], ["Notes", T(k.dispositionNotes)], ["Clôturée le", DT(k.closedAt)], ["Archivée le", DT(k.archivedAt)]] },
        ],
        tables: [
          { title: "Équipe affectée", cols: [{ h: "Nom", w: 40 }, { h: "Rôle dans l'affaire", w: 30 }], rows: k.assignments.map((x: any) => [name(x.user), L(CASE_ROLE, x.role)]) },
          { title: "Personnes liées", cols: [{ h: "N°", w: 18 }, { h: "Nom", w: 34 }, { h: "Rôle", w: 24 }, { h: "Statut", w: 24 }], rows: k.parties.map((x: any) => [x.person?.number ?? "—", name(x.person), L(PARTY_ROLE, x.role), L(PARTY_STATUS, x.status)]) },
        ],
      };
    },
  },
  warrants: {
    key: "warrants", title: "Liste des mandats", view: "warrants:view",
    cols: [{ h: "N°", w: 13 }, { h: "Type", w: 14 }, { h: "Personne visée", w: 24 }, { h: "Statut", w: 13 }, { h: "Autorité émettrice", w: 22 }, { h: "Expiration", w: 12 }],
    list: (a, q, page) => listWarrants(a, { q: q.q, status: q.status, type: q.type, page, pageSize: PAGE }),
    row: (w) => [w.number, L(WARRANT_TYPE, w.type), name(w.person), L(WARRANT_STATUS, w.status), w.issuingAuthority, D(w.expiresAt)],
    sheet: async (a, id) => {
      const w = await getWarrant(a, id);
      return {
        number: w.number, title: `${L(WARRANT_TYPE, w.type)} — ${name(w.person)}`, subtitle: "Fiche de mandat",
        sections: [
          { title: "Mandat", fields: [["Numéro", w.number], ["Type", L(WARRANT_TYPE, w.type)], ["Statut", L(WARRANT_STATUS, w.status)], ["Personne visée", `${name(w.person)} (${w.person?.number ?? "—"})`], ["Affaire liée", w.case?.number ?? "—"], ["Adresse visée", T(w.targetAddress)], ["Émis le", DT(w.issuedAt)], ["Expire le", D(w.expiresAt)]] },
          { title: "Autorité", fields: [["Autorité émettrice", w.issuingAuthority], ["Référence", T(w.issuingAuthorityRef)], ["Motifs", w.grounds]] },
          { title: "Décisions", fields: [["Demandé par", name(w.requestedBy)], ["Approuvé par", name(w.approvedBy)], ["Approuvé le", DT(w.approvedAt)], ["Observations", T(w.decisionNotes)], ["Exécuté par", name(w.executedBy)], ["Exécuté le", DT(w.executedAt)], ["Notes d'exécution", T(w.executionNotes)], ["Annulé le", DT(w.cancelledAt)], ["Motif d'annulation", T(w.cancellationReason)]] },
        ],
        tables: [],
      };
    },
  },
  arrests: {
    key: "arrests", title: "Liste des arrestations", view: "arrests:view",
    cols: [{ h: "N°", w: 12 }, { h: "Personne", w: 22 }, { h: "Arrêtée le", w: 14 }, { h: "Fondement", w: 14 }, { h: "Chefs d'accusation", w: 26 }, { h: "Statut", w: 12 }],
    list: (a, q, page) => listArrests(a, { q: q.q, status: q.status, page, pageSize: PAGE }),
    row: (x) => [x.number, name(x.person), DT(x.arrestedAt), L(ARREST_AUTHORITY, x.authority), x.charges, L(ARREST_STATUS, x.status)],
    sheet: async (a, id) => {
      const x = await getArrest(a, id);
      return {
        number: x.number, title: name(x.person), subtitle: "Fiche d'arrestation",
        sections: [
          { title: "Arrestation", fields: [["Numéro", x.number], ["Statut", L(ARREST_STATUS, x.status)], ["Personne", `${name(x.person)} (${x.person?.number ?? "—"})`], ["Arrêtée le", DT(x.arrestedAt)], ["Lieu", x.locationText], ["Fondement", L(ARREST_AUTHORITY, x.authority)], ["Mandat", x.warrant?.number ?? "—"], ["Affaire", x.case?.number ?? "—"], ["Commissariat", x.station?.name ?? "—"]] },
          { title: "Faits", fields: [["Chefs d'accusation", x.charges], ["Circonstances", T(x.circumstances)], ["Droits lus à", DT(x.rightsReadAt)], ["Agent arrêtant", x.arrestingOfficer ? `${name(x.arrestingOfficer)} (${x.arrestingOfficer.badgeNumber})` : "—"], ["Enregistrée par", name(x.recordedBy)], ["Notes", T(x.notes)]] },
        ],
        tables: [{ title: "Gardes à vue", cols: [{ h: "N°", w: 20 }, { h: "Début", w: 28 }, { h: "Échéance légale", w: 28 }, { h: "Statut", w: 24 }], rows: x.detentions.map((d: any) => [d.number, DT(d.startedAt), DT(d.legalLimitAt), L(DETENTION_STATUS, d.status)]) }],
      };
    },
  },
  detention: {
    key: "detention", title: "Liste des gardes à vue", view: "detention:view",
    cols: [{ h: "N°", w: 12 }, { h: "Personne", w: 22 }, { h: "Début", w: 15 }, { h: "Échéance", w: 15 }, { h: "Cellule", w: 9 }, { h: "Statut", w: 12 }, { h: "Commissariat", w: 15 }],
    list: (a, q, page) => listDetentions(a, { q: q.q, status: q.status, overdue: q.overdue === "1", page, pageSize: PAGE }),
    row: (d) => [d.number, name(d.person), DT(d.startedAt), DT(d.extendedUntil ?? d.legalLimitAt), T(d.cellNumber), L(DETENTION_STATUS, d.status), d.station?.name ?? "—"],
    sheet: async (a, id) => {
      const d = await getDetention(a, id);
      return {
        number: d.number, title: name(d.person), subtitle: "Fiche de garde à vue",
        sections: [
          { title: "Garde à vue", fields: [["Numéro", d.number], ["Statut", L(DETENTION_STATUS, d.status)], ["Personne", `${name(d.person)} (${d.person?.number ?? "—"})`], ["Arrestation", d.arrest?.number ?? "—"], ["Cellule", T(d.cellNumber)], ["Début", DT(d.startedAt)], ["Échéance légale", DT(d.legalLimitAt)], ["Prolongée jusqu'au", DT(d.extendedUntil)], ["Commissariat", d.station?.name ?? "—"]] },
          { title: "Prolongation et fin", fields: [["Autorité de prolongation", T(d.extensionAuthority)], ["Motif de prolongation", T(d.extensionReason)], ["Terminée le", DT(d.endedAt)], ["Issue", d.endReason ? L(DETENTION_END_REASON, d.endReason) : "—"], ["Notes de fin", T(d.endNotes)], ["Notes médicales", T(d.medicalNotes)], ["Enregistrée par", name(d.recordedBy)]] },
        ],
        tables: [{ title: "Journal de surveillance", cols: [{ h: "Date", w: 24 }, { h: "Type", w: 20 }, { h: "Notes", w: 38 }, { h: "Par", w: 18 }], rows: d.logs.map((l: any) => [DT(l.occurredAt), L(DETENTION_LOG_TYPE, l.type), l.notes, name(l.recordedBy)]) }],
      };
    },
  },
  incidents: {
    key: "incidents", title: "Liste des incidents", view: "incidents:view",
    cols: [{ h: "N°", w: 12 }, { h: "Titre", w: 24 }, { h: "Type", w: 14 }, { h: "Gravité", w: 9 }, { h: "Statut", w: 12 }, { h: "Survenu le", w: 14 }, { h: "Lieu", w: 15 }],
    list: (a, q, page) => listIncidents(a, { q: q.q, type: q.type as never, severity: q.severity as never, status: q.status as never, stationId: q.stationId, open: q.open === "1", mine: q.mine === "1", page, pageSize: PAGE }),
    row: (i) => [i.number, i.title, L(INCIDENT_TYPE, i.type), L(SEVERITY, i.severity), L(INCIDENT_STATUS, i.status), DT(i.occurredAt), i.locationText],
    sheet: async (a, id) => {
      const i = await getIncident(a, id);
      return {
        number: i.number, title: i.title, subtitle: "Fiche d'incident",
        sections: [
          { title: "Incident", fields: [["Numéro", i.number], ["Statut", L(INCIDENT_STATUS, i.status)], ["Type", L(INCIDENT_TYPE, i.type)], ["Gravité", L(SEVERITY, i.severity)], ["Survenu le", DT(i.occurredAt)], ["Signalé le", DT(i.reportedAt)], ["Lieu", i.locationText], ["Commissariat", i.station?.name ?? "—"], ["Signalé par", name(i.reportedBy)], ["Affaire liée", i.case?.number ?? "—"], ["Patrouille", i.patrol?.number ?? "—"]] },
          { title: "Description", fields: [["Description", i.description]] },
          { title: "Intervention", fields: [["Rapport d'intervention", T(i.report)], ["Résolu le", DT(i.resolvedAt)]] },
        ],
        tables: [{ title: "Agents intervenus", cols: [{ h: "Matricule", w: 20 }, { h: "Nom", w: 40 }, { h: "Grade", w: 20 }, { h: "Rôle", w: 20 }], rows: ((i as any).officers ?? []).map((o: any) => [o.officer?.badgeNumber ?? "—", name(o.officer), o.officer?.rank?.name ?? "—", T(o.role)]) }],
      };
    },
  },
};
