import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/format";
import type { TransferView } from "@/server/hr/transfers";

const NAVY = "#0f2a4a";
const GRAY = "#64748b";
const LINE = "#d5dde8";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 50, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10.5, color: "#1b2a3b", lineHeight: 1.45 },
  top: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY },
  sub: { textAlign: "center", fontSize: 8.5, color: GRAY, marginTop: 2 },
  title: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 16, color: NAVY, marginTop: 22 },
  number: { textAlign: "center", fontSize: 11, marginTop: 4 },
  para: { marginTop: 10, textAlign: "justify" },
  art: { marginTop: 12 },
  artTitle: { fontFamily: "Helvetica-Bold" },
  box: { marginTop: 14, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 8 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: GRAY, fontSize: 9 },
  value: { flexGrow: 1 },
  sign: { marginTop: 36, flexDirection: "row", justifyContent: "space-between" },
  footer: { position: "absolute", bottom: 20, left: 44, right: 44, fontSize: 7.5, color: GRAY, flexDirection: "row", justifyContent: "space-between" },
});

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <View style={s.row}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>{value && value.trim() ? value : "—"}</Text>
  </View>
);

/** Décision d'affectation (mutation). Only valid for a transfer validated by the competent authority. */
export async function renderTransferDecisionPdf(t: TransferView): Promise<Buffer> {
  const o = t.officer;
  const by = t.validatedBy ? `${t.validatedBy.firstName} ${t.validatedBy.lastName}` : "—";
  const doc = (
    <Document title={`Décision d'affectation ${t.decisionNumber}`} author="SIGPN-T" subject="Décision d'affectation" creator="SIGPN-T">
      <Page size="A4" style={s.page}>
        <Text style={s.top}>RÉPUBLIQUE DU TCHAD — POLICE NATIONALE</Text>
        <Text style={s.sub}>Direction des ressources humaines</Text>
        <Text style={s.title}>DÉCISION D&apos;AFFECTATION</Text>
        <Text style={s.number}>N° {t.decisionNumber}</Text>
        <Text style={s.para}>
          Vu la proposition de mutation n° {t.number} du {fmtDate(t.createdAt, "fr")}, examinée par le service des ressources humaines{t.reviewedAt ? ` le ${fmtDate(t.reviewedAt, "fr")}` : ""}, et validée par l&apos;autorité compétente le {fmtDate(t.validatedAt, "fr")} ;
        </Text>
        <Text style={[s.para, { fontFamily: "Helvetica-Bold" }]}>DÉCIDE :</Text>
        <View style={s.art}>
          <Text>
            <Text style={s.artTitle}>Article 1. </Text>
            {o.rank.name} {o.firstName} {o.lastName}, matricule {o.badgeNumber}, actuellement affecté(e) à {t.fromStation.name}
            {t.fromDepartment ? ` (${t.fromDepartment.name})` : ""}, est affecté(e) à {t.toStation.name}
            {t.toDepartment ? ` (${t.toDepartment.name})` : ""}
            {t.toPosition ? ` en qualité de ${t.toPosition.name}` : ""}.
          </Text>
        </View>
        <View style={s.art}>
          <Text>
            <Text style={s.artTitle}>Article 2. </Text>
            La présente décision prend effet le {fmtDate(t.effectiveDate, "fr")}.
          </Text>
        </View>
        <View style={s.art}>
          <Text>
            <Text style={s.artTitle}>Article 3. </Text>
            Les responsables des structures concernées sont chargés, chacun en ce qui le concerne, de l&apos;exécution de la présente décision, qui sera enregistrée au dossier individuel de l&apos;intéressé(e).
          </Text>
        </View>
        <View style={s.box}>
          <Row label="Agent" value={`${o.rank.name} ${o.firstName} ${o.lastName}`} />
          <Row label="Matricule" value={o.badgeNumber} />
          <Row label="Structure d'origine" value={`${t.fromStation.name} — ${t.fromStation.region.name}`} />
          <Row label="Structure d'accueil" value={`${t.toStation.name} — ${t.toStation.region.name}`} />
          <Row label="Motif" value={t.reason} />
        </View>
        <View style={s.sign}>
          <View>
            <Text style={{ color: GRAY, fontSize: 9 }}>Examiné par les RH</Text>
            <Text>{t.reviewedBy ? `${t.reviewedBy.firstName} ${t.reviewedBy.lastName}` : "—"}</Text>
          </View>
          <View>
            <Text style={{ color: GRAY, fontSize: 9 }}>Validé par l&apos;autorité compétente</Text>
            <Text>{by}</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text>
            SIGPN-T · {t.decisionNumber} · {t.status === "EXECUTED" ? "exécutée" : "validée, en attente d'exécution"}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
