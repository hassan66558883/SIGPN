import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Col, Sheet } from "@/server/exports/registry";

const NAVY = "#0f2a4a";
const GRAY = "#64748b";
const LINE = "#d5dde8";
const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 44, paddingHorizontal: 30, fontFamily: "Helvetica", fontSize: 8.5, color: "#1b2a3b" },
  header: { backgroundColor: NAVY, color: "#fff", padding: 10, borderRadius: 4, flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 7, color: "#c9d8ec", marginTop: 2 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  number: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right", color: "#f5c14a", marginTop: 2 },
  meta: { marginTop: 8, padding: 6, borderWidth: 1, borderColor: LINE, borderRadius: 3, fontSize: 7.5, color: GRAY },
  th: { flexDirection: "row", backgroundColor: "#eef3fa", paddingVertical: 4, paddingHorizontal: 3, marginTop: 8 },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 3, paddingHorizontal: 3 },
  cell: { paddingRight: 4, fontSize: 8 },
  section: { marginTop: 10 },
  sTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1e5aa8", textTransform: "uppercase", marginBottom: 3 },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 6 },
  field: { flexDirection: "row", marginBottom: 3 },
  fLabel: { width: 120, fontSize: 7.5, color: GRAY, textTransform: "uppercase" },
  fValue: { flex: 1, fontSize: 9 },
  footer: { position: "absolute", bottom: 14, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: GRAY },
});

export type Provenance = { who: string; role: string; scope: string; at: string; filters?: string };

const Header = ({ title, number, sub }: { title: string; number?: string; sub: string }) => (
  <View style={s.header}>
    <View>
      <Text style={s.brand}>SIGPN-T</Text>
      <Text style={s.sub}>Police nationale du Tchad — {sub}</Text>
    </View>
    <View>
      <Text style={s.title}>{title}</Text>
      {number ? <Text style={s.number}>{number}</Text> : null}
    </View>
  </View>
);
const Footer = ({ p }: { p: Provenance }) => (
  <View style={s.footer} fixed>
    <Text>Document confidentiel — exporté par {p.who} le {p.at} — chaque export est enregistré au journal d'audit</Text>
    <Text render={({ pageNumber, totalPages }) => `page ${pageNumber} / ${totalPages}`} />
  </View>
);
const Meta = ({ p, extra }: { p: Provenance; extra?: string }) => (
  <View style={s.meta}>
    <Text>Exporté par : {p.who} ({p.role}) — périmètre : {p.scope} — le {p.at}</Text>
    {p.filters ? <Text>Filtres : {p.filters}</Text> : null}
    {extra ? <Text>{extra}</Text> : null}
  </View>
);
const flexOf = (c: Col) => ({ flexGrow: c.w, flexBasis: 0 });
const Table = ({ cols, rows }: { cols: Col[]; rows: string[][] }) => (
  <View>
    <View style={s.th} fixed>
      {cols.map((c, i) => (
        <Text key={i} style={[s.thText, flexOf(c)]}>{c.h}</Text>
      ))}
    </View>
    {rows.map((r, i) => (
      <View key={i} style={s.tr} wrap={false}>
        {cols.map((c, j) => (
          <Text key={j} style={[s.cell, flexOf(c)]}>{r[j] ?? ""}</Text>
        ))}
      </View>
    ))}
  </View>
);

export async function renderList(title: string, cols: Col[], rows: string[][], total: number, p: Provenance): Promise<Buffer> {
  const truncated = total > rows.length;
  return renderToBuffer(
    <Document title={title} author="SIGPN-T">
      <Page size="A4" orientation="landscape" style={s.page}>
        <Header title={title} sub="Export de liste" />
        <Meta p={p} extra={`${rows.length} ligne(s) exportée(s) sur ${total}${truncated ? " — export limité aux premières lignes : affinez les filtres" : ""}`} />
        <Table cols={cols} rows={rows} />
        <Footer p={p} />
      </Page>
    </Document>,
  );
}

export async function renderSheet(sh: Sheet, p: Provenance): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`${sh.subtitle} ${sh.number}`} author="SIGPN-T">
      <Page size="A4" style={s.page}>
        <Header title={sh.subtitle} number={sh.number} sub={sh.title} />
        <Meta p={p} />
        {sh.sections.map((sec, i) => (
          <View key={i} style={s.section} wrap={false}>
            <Text style={s.sTitle}>{sec.title}</Text>
            <View style={s.box}>
              {sec.fields.map(([k, v], j) => (
                <View key={j} style={s.field}>
                  <Text style={s.fLabel}>{k}</Text>
                  <Text style={s.fValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {sh.tables.filter((t) => t.rows.length).map((t, i) => (
          <View key={i} style={s.section}>
            <Text style={s.sTitle}>{t.title}</Text>
            <Table cols={t.cols} rows={t.rows} />
          </View>
        ))}
        <Footer p={p} />
      </Page>
    </Document>,
  );
}
