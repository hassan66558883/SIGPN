# -*- coding: utf-8 -*-
"""Markdown (sous-ensemble) -> Word (.docx) et -> PDF (md2pdf du dépôt STE). Sans service externe."""
import re, subprocess, sys
from pathlib import Path
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

NAVY = RGBColor(0x0B, 0x23, 0x40)
MD2PDF = Path(r"C:\Users\DELL\STE\scripts\md2pdf.py")
FOOT = "SIGEC-PN / SIGPN-T — Police nationale du Tchad — Éditeur : TECHNOTCHAD"

def _field(par, instr):
    r = par.add_run()
    for t, txt in (("begin", None), (None, instr), ("end", None)):
        if t:
            e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), t); r._r.append(e)
        else:
            e = OxmlElement("w:instrText"); e.set(qn("xml:space"), "preserve"); e.text = txt; r._r.append(e)

def _inline(par, text, size=None, color=None):
    for part in re.split(r"(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)", text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            r = par.add_run(part[2:-2]); r.bold = True
        elif part.startswith("`") and part.endswith("`"):
            r = par.add_run(part[1:-1]); r.font.name = "Consolas"; r.font.size = Pt(9)
            continue
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r = par.add_run(part[1:-1]); r.italic = True
        else:
            r = par.add_run(part)
        if size: r.font.size = Pt(size)
        if color: r.font.color.rgb = color

def _shade(cell, hexcol):
    tcPr = cell._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hexcol); tcPr.append(sh)

def to_docx(md_path: Path, out: Path, landscape=False):
    base = md_path.parent
    d = Document()
    s = d.sections[0]
    if landscape:
        s.orientation = WD_ORIENT.LANDSCAPE; s.page_width, s.page_height = s.page_height, s.page_width
    s.left_margin = s.right_margin = Cm(1.8 if landscape else 2.0); s.top_margin = Cm(2.0); s.bottom_margin = Cm(1.8)
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    for lvl, sz in ((1, 20), (2, 15), (3, 12.5), (4, 11)):
        h = d.styles[f"Heading {lvl}"]; h.font.name = "Calibri"; h.font.size = Pt(sz); h.font.bold = True; h.font.color.rgb = NAVY
    hp = s.header.paragraphs[0]; hp.text = FOOT; hp.runs[0].font.size = Pt(8); hp.runs[0].font.color.rgb = RGBColor(0x6B, 0x77, 0x85)
    fp = s.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("Page "); r.font.size = Pt(8); _field(fp, "PAGE")
    lines = md_path.read_text(encoding="utf-8").split("\n")
    i, n = 0, len(lines)
    while i < n:
        ln = lines[i]
        if ln.strip().startswith("```"):
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                i += 1
            i += 1; continue
        if ln.strip() == "<!--pagebreak-->":
            d.add_page_break(); i += 1; continue
        if ln.strip().startswith("[[SOMMAIRE]]"):
            i += 1; continue
        m = re.match(r"^(#{1,4})\s+(.*)", ln)
        if m:
            d.add_heading(re.sub(r"[*`]", "", m.group(2)), level=len(m.group(1))); i += 1; continue
        m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)", ln.strip())
        if m:
            p = base / m.group(2)
            if p.exists():
                try:
                    d.add_picture(str(p), width=Cm(15.5 if not landscape else 22)); d.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
                except Exception:
                    pass
            if m.group(1):
                c = d.add_paragraph(); c.alignment = WD_ALIGN_PARAGRAPH.CENTER; r = c.add_run(m.group(1)); r.italic = True; r.font.size = Pt(8.5)
            i += 1; continue
        if ln.strip().startswith("|") and i + 1 < n and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            hdr = [c.strip() for c in ln.strip().strip("|").split("|")]
            rows = []; i += 2
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            t = d.add_table(rows=1, cols=len(hdr)); t.style = "Table Grid"
            small = 7.5 if len(hdr) > 8 else 9
            for j, h in enumerate(hdr):
                c = t.rows[0].cells[j]; c.text = ""; _inline(c.paragraphs[0], h, small, RGBColor(255, 255, 255)); [setattr(r, "bold", True) for r in c.paragraphs[0].runs]; _shade(c, "0B2340")
            for row in rows:
                cells = t.add_row().cells
                for j in range(len(hdr)):
                    cells[j].text = ""; _inline(cells[j].paragraphs[0], row[j] if j < len(row) else "", small)
            d.add_paragraph(); continue
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)", ln)
        if m:
            style = "List Number" if m.group(2)[0].isdigit() else "List Bullet"
            p = d.add_paragraph(style=style); _inline(p, m.group(3)); i += 1; continue
        if ln.startswith(">"):
            p = d.add_paragraph(); p.paragraph_format.left_indent = Cm(0.8); _inline(p, ln.lstrip("> ").strip(), 10, RGBColor(0x55, 0x40, 0x10)); i += 1; continue
        if ln.strip() == "":
            i += 1; continue
        p = d.add_paragraph(); _inline(p, ln.strip()); i += 1
    d.save(out)

def to_pdf(md_path: Path, out: Path, landscape=False):
    """md2pdf résout les images depuis une « archive » : on passe la racine du livrable et on réécrit les chemins en conséquence."""
    sys.path.insert(0, str(MD2PDF.parent))
    import md2pdf
    root = md_path
    while root.name != "SIGEC_PN_DOCUMENTATION":
        root = root.parent
    text = md_path.read_text(encoding="utf-8")
    def fix(m):
        p = (md_path.parent / m.group(2)).resolve()
        try:
            return f"![{m.group(1)}]({p.relative_to(root.resolve()).as_posix()})"
        except ValueError:
            return m.group(0)
    tmp = md_path.with_name("_pdfsrc_" + md_path.name)
    tmp.write_text(re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", fix, text), encoding="utf-8")
    try:
        md2pdf.convert(tmp, out, landscape, base=root)
        return True
    except Exception as e:
        print("PDF FAIL", md_path.name, e)
        return False
    finally:
        tmp.unlink(missing_ok=True)
