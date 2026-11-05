import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/format";
import { TRAINING_KIND, labelOf } from "@/lib/labels";
import type { TrainingView } from "@/server/hr/training";

const NAVY = "#0f2a4a";
const GRAY = "#64748b";

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1b2a3b", lineHeight: 1.5 },
  frame: { borderWidth: 2, borderColor: NAVY, padding: 28, flexGrow: 1 },
  top: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY },
  sub: { textAlign: "center", fontSize: 8.5, color: GRAY, marginTop: 2 },
  title: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 22, color: NAVY, marginTop: 36 },
  number: { textAlign: "center", fontSize: 10, color: GRAY, marginTop: 4 },
  body: { marginTop: 28, textAlign: "center" },
  name: { fontFamily: "Helvetica-Bold", fontSize: 16, marginVertical: 8, textAlign: "center" },
  course: { fontFamily: "Helvetica-Bold", fontSize: 13, color: NAVY, marginVertical: 6, textAlign: "center" },
  foot: { position: "absolute", bottom: 40, left: 76, right: 76, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: GRAY },
});

/** Attestation de formation (French). Only issued after a successful evaluation. */
export async function renderCertificatePdf(t: TrainingView): Promise<Buffer> {
  const o = t.officer;
  const kind = labelOf(TRAINING_KIND, t.kind, "fr").label;
  const doc = (
    <Document title={`Attestation ${t.certificateNo}`} author="SIGPN-T" subject="Attestation de formation" creator="SIGPN-T">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <Text style={s.top}>RÉPUBLIQUE DU TCHAD — POLICE NATIONALE</Text>
          <Text style={s.sub}>Direction des ressources humaines</Text>
          <Text style={s.title}>ATTESTATION DE FORMATION</Text>
          <Text style={s.number}>N° {t.certificateNo}</Text>
          <View style={s.body}>
            <Text>Il est attesté que</Text>
            <Text style={s.name}>
              {o.rank.name} {o.firstName} {o.lastName} — matricule {o.badgeNumber}
            </Text>
            <Text>a suivi avec succès la {kind.toLowerCase()}</Text>
            <Text style={s.course}>« {t.title} »</Text>
            <Text>
              {t.provider ? `dispensée par ${t.provider}, ` : ""}du {fmtDate(t.startDate, "fr")}
              {t.endDate ? ` au ${fmtDate(t.endDate, "fr")}` : ""}
              {t.score != null ? ` — note : ${t.score}/20` : ""}.
            </Text>
          </View>
          <View style={s.foot}>
            <Text>Délivrée le {fmtDate(t.certificateIssuedAt, "fr")}</Text>
            <Text>SIGPN-T · {t.certificateNo}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
