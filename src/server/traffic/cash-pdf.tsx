/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer <Image> is a PDF primitive, not an HTML <img> */
import "server-only";
import QRCode from "qrcode";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { env } from "@/server/env";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtFcfaPlain as fmtFcfa } from "@/lib/traffic-format";
import { CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import type { getClosure, getDeposit } from "@/server/traffic/cash-queries";
import type { RevenueReport } from "@/server/traffic/cash-reports";

type DepositData = Awaited<ReturnType<typeof getDeposit>>;
type ClosureData = Awaited<ReturnType<typeof getClosure>>;

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
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 3 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, padding: 6, backgroundColor: "#eef3fa", borderRadius: 3 },
  small: { fontSize: 7.5, color: GRAY },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: GRAY },
  seal: { flexDirection: "row", gap: 10, marginTop: 10, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 8, alignItems: "center" },
  sign: { flex: 1, height: 64, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 6 },
});

const Field = ({ label, value, flex = 1 }: { label: string; value: string | number | null | undefined; flex?: number }) => (
  <View style={[s.cell, { flexGrow: flex }]}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>{value !== null && value !== undefined && String(value).trim() ? String(value) : "—"}</Text>
  </View>
);

const Head = ({ title, number }: { title: string; number: string }) => (
  <View style={s.header}>
    <View>
      <Text style={s.hBrand}>SIGPN-T</Text>
      <Text style={s.hSub}>Système Intégré de Gestion Numérique de la Police Nationale du Tchad</Text>
    </View>
    <View>
      <Text style={s.hTitle}>{title}</Text>
      <Text style={s.hNumber}>{number}</Text>
    </View>
  </View>
);

const qr = (url: string) => QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" });
const name = (u: { firstName: string; lastName: string } | null | undefined) => (u ? `${u.firstName} ${u.lastName}` : null);

/** Bordereau de versement des recettes (A4). */
export async function renderDepositSlipPdf(d: DepositData): Promise<Buffer> {
  const slip = d.slip!;
  const verifyUrl = `${env.appUrl}/verify/deposit/${slip.verificationToken}`;
  const code = await qr(verifyUrl);
  const gap = d.collectedFcfa - d.amountDepositedFcfa;
  const doc = (
    <Document title={`Bordereau ${slip.number}`} author="SIGPN-T" subject="Bordereau de versement des recettes" creator="SIGPN-T">
      <Page size="A4" style={s.page}>
        <Head title="BORDEREAU DE VERSEMENT DES RECETTES" number={slip.number} />
        <View style={s.section}>
          <Text style={s.sTitle}>Agent collecteur</Text>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="Agent collecteur" value={name(d.agent)} />
              <Field label="Matricule" value={d.agentBadge} />
              <Field label="Unité / commissariat" value={d.station.name} />
            </View>
            <View style={s.row}>
              <Field label="Caisse" value={d.register.number} />
              <Field label="Période de collecte" value={`${fmtDate(d.periodFrom, "fr")} → ${fmtDate(d.periodTo, "fr")}`} />
              <Field label="Nombre de paiements" value={d.items.length} />
            </View>
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sTitle}>Montants</Text>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="Total encaissé (caisse)" value={fmtFcfa(d.collectedFcfa)} />
              <Field label="Montant à verser (solde de la caisse)" value={fmtFcfa(d.amountDueFcfa)} />
              <Field label="Montant versé" value={fmtFcfa(d.amountDepositedFcfa)} />
            </View>
            <View style={s.row}>
              <Field label="Écart (encaissé − versé)" value={fmtFcfa(gap)} />
              <Field label="Statut du versement" value={labelOf(CASH_DEPOSIT_STATUS, d.status, "fr").label} />
              <Field label="Tentative" value={d.attempt} />
            </View>
          </View>
          <View style={s.totalRow}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Montant versé</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>{fmtFcfa(d.amountDepositedFcfa)}</Text>
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sTitle}>Versement</Text>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="N° du versement" value={d.number} />
              <Field label="Mode de versement" value={labelOf(CASH_DEPOSIT_METHOD, d.method, "fr").label} />
              <Field label="Date et heure" value={fmtDateTime(d.depositedAt, "fr")} />
            </View>
            <View style={s.row}>
              <Field label="N° du bordereau bancaire" value={d.slipNumber} />
              <Field label="Référence bancaire / transaction" value={d.reference} />
              <Field label="Destinataire" value={d.recipient} />
            </View>
            <View style={s.row}>
              <Field label="Versé par" value={name(d.depositedBy)} />
              <Field label="Reçu par" value={name(d.receivedBy)} />
              <Field label="Observations" value={d.observations} flex={1} />
            </View>
          </View>
        </View>
        <View style={[s.section, { flexDirection: "row", gap: 8 }]} wrap={false}>
          <View style={s.sign}>
            <Text style={s.label}>Agent collecteur (signature)</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.label}>Agent réceptionnaire (signature)</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.label}>Validation du responsable</Text>
            {d.validatedBy ? <Text style={[s.small, { marginTop: 6 }]}>Validé par {name(d.validatedBy)} le {fmtDateTime(d.validatedAt!, "fr")}</Text> : <Text style={[s.small, { marginTop: 6 }]}>En attente de validation</Text>}
          </View>
        </View>
        <View style={s.seal} wrap={false}>
          <Image src={code} style={{ width: 76, height: 76 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>Vérification par QR code</Text>
            <Text style={s.small}>Scannez le code ou ouvrez l’adresse pour contrôler l’authenticité de ce bordereau :</Text>
            <Text style={{ fontSize: 7.5, color: BLUE, marginTop: 2 }}>{verifyUrl}</Text>
            <Text style={{ fontSize: 6.5, color: GRAY, marginTop: 3 }}>Établi le {fmtDateTime(slip.issuedAt, "fr")} par {name(slip.issuedBy)} — empreinte SHA-256 : {slip.contentHash}</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text>SIGPN-T — Police Nationale du Tchad · Document généré électroniquement · {slip.number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

/** État journalier des recettes (A4): frozen figures of the closing + the detail of the payments. */
export async function renderDailyStatementPdf(c: ClosureData): Promise<Buffer> {
  const r = c.register;
  const lines = r.transactions.filter((t) => !t.voidedAt && t.payment.status === "COMPLETED");
  const doc = (
    <Document title={`État journalier ${c.number}`} author="SIGPN-T" subject="État journalier des recettes" creator="SIGPN-T">
      <Page size="A4" style={s.page}>
        <Head title="ÉTAT JOURNALIER DES RECETTES" number={c.number} />
        <View style={s.section}>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="Agent" value={name(r.agent)} />
              <Field label="Matricule" value={r.agentBadge} />
              <Field label="Unité" value={r.station.name} />
            </View>
            <View style={s.row}>
              <Field label="Caisse" value={r.number} />
              <Field label="Ouverture" value={fmtDateTime(r.openedAt, "fr")} />
              <Field label="Clôture" value={fmtDateTime(c.closedAt, "fr")} />
            </View>
            <View style={s.row}>
              <Field label="Nombre de paiements" value={c.paymentsCount} />
              <Field label="Montant total des amendes" value={fmtFcfa(c.finesTotalFcfa)} />
              <Field label="Total encaissé" value={fmtFcfa(c.collectedFcfa)} />
            </View>
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sTitle}>Détail par mode de paiement</Text>
          <View style={s.box}>
            <View style={s.row}>
              <Field label="Espèces" value={fmtFcfa(c.cashFcfa)} />
              <Field label="Paiement électronique" value={fmtFcfa(c.electronicFcfa)} />
              <Field label="Mobile Money" value={fmtFcfa(c.mobileMoneyFcfa)} />
              <Field label="Autres paiements" value={fmtFcfa(c.otherFcfa)} />
            </View>
          </View>
          <View style={s.totalRow}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Total à verser</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>{fmtFcfa(c.amountToDepositFcfa)}</Text>
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sTitle}>Opérations de la journée (reçus et PV)</Text>
          <View style={[s.tr, { borderBottomColor: GRAY }]}>
            <Text style={[s.th, { width: 84 }]}>Reçu</Text>
            <Text style={[s.th, { width: 84 }]}>PV</Text>
            <Text style={[s.th, { width: 84 }]}>Paiement</Text>
            <Text style={[s.th, { flex: 1 }]}>Mode / référence</Text>
            <Text style={[s.th, { width: 70, textAlign: "right" }]}>Montant</Text>
          </View>
          {lines.map((t) => (
            <View key={t.payment.number} style={s.tr} wrap={false}>
              <Text style={{ width: 84 }}>{t.payment.receipt?.number ?? "—"}</Text>
              <Text style={{ width: 84 }}>{t.payment.fine.ticket.number}</Text>
              <Text style={{ width: 84 }}>{t.payment.number}</Text>
              <Text style={{ flex: 1 }}>{labelOf(TRAFFIC_PAYMENT_METHOD, t.method, "fr").label}{t.payment.transactionReference ? ` — ${t.payment.transactionReference}` : ""}</Text>
              <Text style={{ width: 70, textAlign: "right" }}>{fmtFcfa(t.amountFcfa)}</Text>
            </View>
          ))}
        </View>
        <View style={[s.section, { flexDirection: "row", gap: 8 }]} wrap={false}>
          <View style={s.sign}>
            <Text style={s.label}>Agent (signature)</Text>
            <Text style={[s.small, { marginTop: 6 }]}>Clôturé par {name(c.closedBy)} le {fmtDateTime(c.closedAt, "fr")}</Text>
          </View>
          <View style={s.sign}>
            <Text style={s.label}>Vérification du responsable d’unité</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text>SIGPN-T — État généré électroniquement à la clôture de la caisse · {c.number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

const cellText = (v: string | number | undefined, kind: string) => (v === undefined || v === "" ? "—" : kind === "money" ? fmtFcfa(Number(v)) : String(v));

/** Financial report (A4 landscape): generic table + totals. */
export async function renderReportPdf(r: RevenueReport, who: string): Promise<Buffer> {
  const period = `${fmtDate(r.range.from, "fr")} → ${fmtDate(new Date(r.range.to.getTime() - 1), "fr")}`;
  const doc = (
    <Document title={r.titleFr} author="SIGPN-T" subject={r.titleFr} creator="SIGPN-T">
      <Page size="A4" orientation="landscape" style={s.page}>
        <Head title={r.titleFr.toUpperCase()} number={period} />
        <View style={s.section}>
          <Text style={s.small}>Établi le {fmtDateTime(r.generatedAt, "fr")} par {who}. Montants en FCFA. Seuls les paiements enregistrés dans les caisses des agents et les versements de votre périmètre sont comptés.</Text>
        </View>
        <View style={[s.section, s.box, { padding: 0 }]}>
          <View style={[s.tr, { paddingHorizontal: 5, backgroundColor: "#eef3fa" }]} fixed>
            {r.columns.map((c) => (
              <Text key={c.key} style={[s.th, { flex: 1, textAlign: c.kind === "money" || c.kind === "int" ? "right" : "left", paddingRight: 4 }]}>{c.fr}</Text>
            ))}
          </View>
          {r.rows.map((row, i) => (
            <View key={i} style={[s.tr, { paddingHorizontal: 5 }]} wrap={false}>
              {r.columns.map((c) => (
                <Text key={c.key} style={{ flex: 1, textAlign: c.kind === "money" || c.kind === "int" ? "right" : "left", paddingRight: 4, fontSize: 8 }}>{cellText(row[c.key], c.kind)}</Text>
              ))}
            </View>
          ))}
          {r.rows.length === 0 ? <Text style={{ padding: 8, color: GRAY }}>Aucune donnée sur la période.</Text> : null}
          {r.totals ? (
            <View style={[s.tr, { paddingHorizontal: 5, backgroundColor: "#eef3fa" }]} wrap={false}>
              {r.columns.map((c) => (
                <Text key={c.key} style={{ flex: 1, textAlign: c.kind === "money" || c.kind === "int" ? "right" : "left", paddingRight: 4, fontSize: 8, fontFamily: "Helvetica-Bold" }}>{r.totals?.[c.key] === undefined ? "" : cellText(r.totals[c.key], c.kind)}</Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={s.footer} fixed>
          <Text>SIGPN-T — {r.titleFr} · {period}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
