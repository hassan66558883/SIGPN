import "server-only";
import { Document as PdfDocument, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { AlignmentType, Document as DocxDocument, Footer, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from "docx";

/** Frozen, fully rendered (French) content of a generated HR document: the single source of its PDF and Word versions. */
export type DocContent = {
  header: string[];
  title: string;
  number: string;
  issuedAt: string;
  confidential?: boolean;
  visas?: string[];
  paragraphs?: string[];
  articles?: { title?: string; text: string }[];
  table?: { label: string; value: string }[];
  signatures?: { role: string; name?: string }[];
};

const NAVY = "#0f2a4a";
const GRAY = "#64748b";
const LINE = "#d5dde8";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 52, paddingHorizontal: 46, fontFamily: "Helvetica", fontSize: 10.5, color: "#1b2a3b", lineHeight: 1.45 },
  top: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY },
  sub: { textAlign: "center", fontSize: 8.5, color: GRAY, marginTop: 2 },
  conf: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 9, color: "#b91c1c", marginTop: 6 },
  title: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 15, color: NAVY, marginTop: 20 },
  number: { textAlign: "center", fontSize: 10, marginTop: 4 },
  para: { marginTop: 9, textAlign: "justify" },
  art: { marginTop: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  box: { marginTop: 14, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 8 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 140, color: GRAY, fontSize: 9 },
  value: { flexGrow: 1 },
  sign: { marginTop: 34, flexDirection: "row", justifyContent: "space-around" },
  footer: { position: "absolute", bottom: 20, left: 46, right: 46, fontSize: 7.5, color: GRAY, flexDirection: "row", justifyContent: "space-between" },
});

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function renderDocPdf(c: DocContent): Promise<Buffer> {
  const doc = (
    <PdfDocument title={`${c.title} ${c.number}`} author="SIGPN-T" subject={c.title} creator="SIGPN-T">
      <Page size="A4" style={s.page}>
        {c.header.map((h, i) => (
          <Text key={i} style={i === 0 ? s.top : s.sub}>
            {h}
          </Text>
        ))}
        {c.confidential ? <Text style={s.conf}>CONFIDENTIEL — USAGE RESTREINT</Text> : null}
        <Text style={s.title}>{c.title.toUpperCase()}</Text>
        <Text style={s.number}>N° {c.number}</Text>
        {(c.visas ?? []).map((v, i) => (
          <Text key={`v${i}`} style={s.para}>
            {v}
          </Text>
        ))}
        {c.articles?.length ? <Text style={[s.para, s.bold]}>DÉCIDE :</Text> : null}
        {(c.articles ?? []).map((a, i) => (
          <View key={`a${i}`} style={s.art}>
            <Text>
              <Text style={s.bold}>{a.title ?? `Article ${i + 1}.`} </Text>
              {a.text}
            </Text>
          </View>
        ))}
        {(c.paragraphs ?? []).map((p, i) => (
          <Text key={`p${i}`} style={s.para}>
            {p}
          </Text>
        ))}
        {c.table?.length ? (
          <View style={s.box}>
            {c.table.map((r, i) => (
              <View key={i} style={s.row}>
                <Text style={s.label}>{r.label}</Text>
                <Text style={s.value}>{r.value || "—"}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[s.para, { marginTop: 16 }]}>Fait le {dateFr(c.issuedAt)}.</Text>
        {c.signatures?.length ? (
          <View style={s.sign}>
            {c.signatures.map((g, i) => (
              <View key={i}>
                <Text style={{ color: GRAY, fontSize: 9 }}>{g.role}</Text>
                <Text>{g.name ?? " "}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={s.footer} fixed>
          <Text>
            SIGPN-T · {c.number}
            {c.confidential ? " · confidentiel" : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </PdfDocument>
  );
  return renderToBuffer(doc);
}

const centered = (text: string, o: { bold?: boolean; size?: number; color?: string; before?: number } = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before ?? 0, after: 60 }, children: [new TextRun({ text, bold: o.bold, size: (o.size ?? 10) * 2, color: o.color })] });
const body = (text: string, o: { before?: number; bold?: string } = {}) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: o.before ?? 160 }, children: [...(o.bold ? [new TextRun({ text: `${o.bold} `, bold: true })] : []), new TextRun({ text })] });

export async function renderDocDocx(c: DocContent): Promise<Buffer> {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const children: (Paragraph | Table)[] = [
    ...c.header.map((h, i) => centered(h, { bold: i === 0, size: i === 0 ? 10 : 8.5, color: i === 0 ? "0F2A4A" : "64748B" })),
    ...(c.confidential ? [centered("CONFIDENTIEL — USAGE RESTREINT", { bold: true, size: 9, color: "B91C1C", before: 120 })] : []),
    centered(c.title.toUpperCase(), { bold: true, size: 15, color: "0F2A4A", before: 360 }),
    centered(`N° ${c.number}`, { size: 10 }),
    ...(c.visas ?? []).map((v) => body(v)),
    ...(c.articles?.length ? [body("", { bold: "DÉCIDE :" })] : []),
    ...(c.articles ?? []).map((a, i) => body(a.text, { bold: a.title ?? `Article ${i + 1}.` })),
    ...(c.paragraphs ?? []).map((p) => body(p)),
  ];
  if (c.table?.length) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: c.table.map(
          (r) =>
            new TableRow({
              children: [
                new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, borders: { top: none, bottom: none, left: none, right: none }, children: [new Paragraph({ children: [new TextRun({ text: r.label, color: "64748B", size: 18 })] })] }),
                new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, borders: { top: none, bottom: none, left: none, right: none }, children: [new Paragraph({ children: [new TextRun({ text: r.value || "—" })] })] }),
              ],
            }),
        ),
      }),
    );
  }
  children.push(body(`Fait le ${dateFr(c.issuedAt)}.`, { before: 320 }));
  if (c.signatures?.length) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: c.signatures.map((g) => new TableCell({ borders: { top: none, bottom: none, left: none, right: none }, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: g.role, color: "64748B", size: 18 })] }), new Paragraph({ children: [new TextRun({ text: g.name ?? " " })] })] })),
          }),
        ],
      }),
    );
  }
  const doc = new DocxDocument({
    creator: "SIGPN-T",
    title: `${c.title} ${c.number}`,
    sections: [{ footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SIGPN-T · ${c.number}${c.confidential ? " · confidentiel" : ""}`, color: "64748B", size: 15 })] })] }) }, children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
