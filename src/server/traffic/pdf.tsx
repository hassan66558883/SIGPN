/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer <Image> is a PDF primitive, not an HTML <img> */
import "server-only";
import QRCode from "qrcode";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { env } from "@/server/env";
import { readUpload } from "@/server/storage";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfaPlain as fmtFcfa } from "@/lib/traffic-format";
import { TRAFFIC_FINE_STATUS, TRAFFIC_PAYMENT_METHOD, TRAFFIC_VEHICLE_TYPE, labelOf } from "@/lib/labels";
import type { getReceipt, getTicket } from "@/server/traffic/queries";

type TicketData = Awaited<ReturnType<typeof getTicket>>;
type ReceiptData = Awaited<ReturnType<typeof getReceipt>>;

const NAVY = "#0f2a4a";
const BLUE = "#1e5aa8";
const GRAY = "#64748b";
const LINE = "#d5dde8";

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, color: "#1b2a3b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: NAVY, color: "#ffffff", padding: 12, borderRadius: 4 },
  hBrand: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  hSub: { fontSize: 7, marginTop: 2, color: "#c9d8ec", maxWidth: 260 },
  hTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hNumber: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2, color: "#f5c14a" },
  section: { marginTop: 10 },
  sTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.6 },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 7 },
  row: { flexDirection: "row" },
  cell: { flexGrow: 1, flexBasis: 0, paddingRight: 8, marginBottom: 4 },
  label: { fontSize: 7, color: GRAY, textTransform: "uppercase" },
  value: { fontSize: 9.5, marginTop: 1 },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, padding: 6, backgroundColor: "#eef3fa", borderRadius: 3 },
  small: { fontSize: 7.5, color: GRAY },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: GRAY },
  seal: { flexDirection: "row", gap: 10, marginTop: 10, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 8, alignItems: "center" },
});

const Field = ({ label, value, flex = 1 }: { label: string; value: string | null | undefined; flex?: number }) => (
  <View style={[s.cell, { flexGrow: flex }]}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>{value && value.trim() ? value : "—"}</Text>
  </View>
);

async function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" });
}

const IMAGE_FORMAT: Record<string, "jpg" | "png"> = { "image/jpeg": "jpg", "image/png": "png" };

async function embeddableImages(t: TicketData) {
  const out: { data: Buffer; format: "jpg" | "png"; caption: string }[] = [];
  for (const e of t.control.evidence) {
    const v = e.document?.versions[0];
    if (!v || e.kind !== "PHOTO" || !IMAGE_FORMAT[v.mimeType] || v.sizeBytes > 3_000_000) continue;
    try {
      out.push({ data: await readUpload(v.storagePath), format: IMAGE_FORMAT[v.mimeType], caption: e.caption || v.fileName });
    } catch {
      /* a missing file must not prevent the PV from being printed */
    }
    if (out.length >= 4) break;
  }
  return out;
}

export async function renderTicketPdf(t: TicketData): Promise<Buffer> {
  const verifyUrl = `${env.appUrl}/verify/pv/${t.verificationToken}`;
  const [qr, images] = await Promise.all([qrDataUrl(verifyUrl), embeddableImages(t)]);
  const officer = t.issuedBy;
  const d = t.driverPerson;
  const v = t.control.vehicle;
  const cni = d && t.showIdentity ? d.identifiers.find((i) => i.type === "NATIONAL_ID")?.value : null;
  const drv = d?.trafficDriver;
  const amountLabel = (a: number | null, text: string) => (a === null ? `${text}` : fmtFcfa(a));
  const doc = (
    <Document title={`Procès-verbal ${t.number}`} author="SIGPN-T" subject="Procès-verbal électronique de contravention" creator="SIGPN-T">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hBrand}>SIGPN-T</Text>
            <Text style={s.hSub}>Système Intégré de Gestion Numérique de la Police Nationale du Tchad</Text>
          </View>
          <View>
            <Text style={s.hTitle}>PROCÈS-VERBAL ÉLECTRONIQUE</Text>
            <Text style={s.hNumber}>{t.number}</Text>
            {t.status === "CANCELLED" ? <Text style={[s.hTitle, { color: "#fca5a5" }]}>ANNULÉ</Text> : null}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Circonstances du contrôle</Text>
          <View style={[s.box, s.row]}>
            <Field label="Date et heure" value={fmtDateTime(t.control.controlledAt, "fr")} />
            <Field label="Lieu" value={t.control.location + (t.control.latitude != null && t.control.longitude != null ? ` (${t.control.latitude.toFixed(5)}, ${t.control.longitude.toFixed(5)})` : "")} flex={2} />
            <Field label="N° du contrôle" value={t.control.number} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Agent verbalisateur et unité</Text>
          <View style={[s.box, s.row]}>
            <Field label="Agent" value={`${officer.firstName} ${officer.lastName}`} flex={2} />
            <Field label="Grade" value={officer.officer?.rank.name} />
            <Field label="Matricule" value={officer.officer?.badgeNumber} />
            <Field label="Unité / commissariat" value={t.station.name} flex={2} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Conducteur</Text>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="Nom" value={d?.lastName} />
              <Field label="Prénom" value={d?.firstName} />
              <Field label="Date de naissance" value={d?.dateOfBirth && t.showIdentity ? fmtDate(d.dateOfBirth, "fr") : null} />
              <Field label="N° dossier personne" value={d?.number} />
            </View>
            <View style={s.row}>
              <Field label="N° de permis" value={drv?.licenseNumber ?? t.control.licenseNumber} />
              <Field label="Catégorie" value={drv?.licenseCategory} />
              <Field label="Expiration du permis" value={drv?.licenseExpiresAt ? fmtDate(drv.licenseExpiresAt, "fr") : null} />
              <Field label="CNI" value={cni} />
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Véhicule</Text>
          <View style={[s.box, s.row]}>
            <Field label="Immatriculation" value={t.plateNumber} />
            <Field label="Type" value={labelOf(TRAFFIC_VEHICLE_TYPE, t.control.vehicleType, "fr").label} />
            <Field label="Marque / modèle" value={[v?.make ?? t.control.vehicleMake, v?.model].filter(Boolean).join(" ")} />
            <Field label="Couleur" value={v?.color ?? t.control.vehicleColor} />
            <Field label="Carte grise" value={v?.registrationCardNumber} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Infractions relevées</Text>
          <View style={[s.tr, { borderTopWidth: 1, borderTopColor: LINE }]}>
            <Text style={[s.th, { width: "36%" }]}>Infraction</Text>
            <Text style={[s.th, { width: "11%" }]}>Classe</Text>
            <Text style={[s.th, { width: "33%" }]}>Texte / référence juridique</Text>
            <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Amende forfaitaire</Text>
          </View>
          {t.offences.map((o) => (
            <View key={o.id} style={s.tr} wrap={false}>
              <Text style={{ width: "36%", paddingRight: 4 }}>{o.name}</Text>
              <Text style={{ width: "11%" }}>{fmtClassText(o.classText)}</Text>
              <Text style={{ width: "33%", paddingRight: 4, fontSize: 8 }}>{o.legalReference}</Text>
              <Text style={{ width: "20%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>{amountLabel(o.amountFcfa, o.amountText)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Montant total de l’amende forfaitaire</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{t.totalFineFcfa > 0 ? fmtFcfa(t.totalFineFcfa) : "—"}</Text>
          </View>
          {t.hasNonSettleableOffence ? <Text style={[s.small, { marginTop: 3 }]}>Au moins une infraction porte la mention « Interdiction d’arbitrer » dans le tableau officiel : aucun montant forfaitaire n’est indiqué pour celle-ci.</Text> : null}
          {t.fine ? <Text style={[s.small, { marginTop: 3 }]}>Amende n° {t.fine.number} — statut : {labelOf(TRAFFIC_FINE_STATUS, t.fine.status, "fr").label}{t.fine.dueDate ? ` — échéance : ${fmtDate(t.fine.dueDate, "fr")}` : ""}</Text> : null}
        </View>

        {t.observations || t.control.observations ? (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Observations</Text>
            <View style={s.box}>
              <Text>{t.observations ?? t.control.observations}</Text>
            </View>
          </View>
        ) : null}

        {images.length ? (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Preuves photographiques ({t.control.evidence.length})</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {images.map((im, i) => (
                <View key={i} style={{ width: "24%" }}>
                  <Image src={{ data: im.data, format: im.format }} style={{ height: 80, objectFit: "cover", borderRadius: 2 }} />
                  <Text style={s.small}>{im.caption.slice(0, 40)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : t.control.evidence.length ? (
          <View style={s.section}>
            <Text style={s.sTitle}>Preuves jointes</Text>
            {t.control.evidence.map((e) => (
              <Text key={e.id} style={s.small}>
                {e.kind} — {e.caption ?? e.document?.versions[0]?.fileName} (sha256 {e.document?.versions[0]?.sha256.slice(0, 16)}…)
              </Text>
            ))}
          </View>
        ) : null}

        <View style={s.seal} wrap={false}>
          <Image src={qr} style={{ width: 84, height: 84 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>Vérification par QR code</Text>
            <Text style={s.small}>Scannez le code ou ouvrez l’adresse ci-dessous pour contrôler l’authenticité de ce PV :</Text>
            <Text style={{ fontSize: 7.5, color: BLUE, marginTop: 2 }}>{verifyUrl}</Text>
            <Text style={[s.small, { marginTop: 6 }]}>Cachet électronique (intégrité) — scellé par {officer.firstName} {officer.lastName} le {fmtDateTime(t.signedAt, "fr")}</Text>
            <Text style={{ fontSize: 6.5, color: GRAY, marginTop: 1 }}>SHA-256 : {t.contentHash}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>SIGPN-T — Police Nationale du Tchad · Document généré électroniquement · {t.number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export async function renderReceiptPdf(r: ReceiptData): Promise<Buffer> {
  const verifyUrl = `${env.appUrl}/verify/receipt/${r.verificationToken}`;
  const qr = await qrDataUrl(verifyUrl);
  const remaining = r.fine.amountFcfa - r.fine.amountPaidFcfa;
  const doc = (
    <Document title={`Reçu ${r.number}`} author="SIGPN-T" subject="Reçu de paiement d’amende" creator="SIGPN-T">
      <Page size="A5" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hBrand}>SIGPN-T</Text>
            <Text style={s.hSub}>Système Intégré de Gestion Numérique de la Police Nationale du Tchad</Text>
          </View>
          <View>
            <Text style={s.hTitle}>REÇU DE PAIEMENT</Text>
            <Text style={s.hNumber}>{r.number}</Text>
            {r.payment.status === "VOIDED" ? <Text style={[s.hTitle, { color: "#fca5a5" }]}>PAIEMENT ANNULÉ</Text> : null}
          </View>
        </View>
        <View style={s.section}>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="N° du PV" value={r.fine.ticket.number} />
              <Field label="N° de l’amende" value={r.fine.number} />
            </View>
            <View style={s.row}>
              <Field label="Contrevenant" value={r.fine.driverPerson ? `${r.fine.driverPerson.lastName} ${r.fine.driverPerson.firstName}` : null} />
              <Field label="Immatriculation" value={r.fine.plateNumber} />
            </View>
            <View style={s.row}>
              <Field label="Date du paiement" value={fmtDateTime(r.payment.paidAt, "fr")} />
              <Field label="Mode de paiement" value={labelOf(TRAFFIC_PAYMENT_METHOD, r.payment.method, "fr").label} />
            </View>
            <View style={s.row}>
              <Field label="Référence de transaction" value={r.payment.transactionReference} />
              <Field label="Point de paiement" value={r.payment.paymentPoint ?? r.payment.station?.name} />
            </View>
            <View style={s.row}>
              <Field label="Agent" value={`${r.payment.receivedBy.firstName} ${r.payment.receivedBy.lastName}`} />
              <Field label="Matricule" value={r.payment.receivedBy.officer?.badgeNumber} />
            </View>
          </View>
          <View style={s.totalRow}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Montant payé</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>{fmtFcfa(r.amountFcfa)}</Text>
          </View>
          <Text style={[s.small, { marginTop: 4 }]}>Amende : {fmtFcfa(r.fine.amountFcfa)} — déjà payé : {fmtFcfa(r.fine.amountPaidFcfa)} — reste à payer : {fmtFcfa(remaining)} — statut : {labelOf(TRAFFIC_FINE_STATUS, r.fine.status, "fr").label}</Text>
        </View>
        <View style={s.seal} wrap={false}>
          <Image src={qr} style={{ width: 76, height: 76 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>Vérification par QR code</Text>
            <Text style={{ fontSize: 7, color: BLUE, marginTop: 2 }}>{verifyUrl}</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text>SIGPN-T — Reçu généré électroniquement · {r.number}</Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
