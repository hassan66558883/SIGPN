"""Rendu des diagrammes de workflow : image PNG (PIL, hors ligne) + source Mermaid, à partir de la MÊME liste d'étapes.

Une étape = dict(a=acteur, t=texte, k='step'|'decision'|'end'|'system', s=statut éventuel).
"""
from PIL import Image, ImageDraw, ImageFont

FD = "C:/Windows/Fonts/"
def font(sz, bold=False):
    for n in (("arialbd.ttf" if bold else "arial.ttf"), "segoeui.ttf"):
        try:
            return ImageFont.truetype(FD + n, sz)
        except OSError:
            pass
    return ImageFont.load_default()

ACTOR_COLORS = {
    "Citoyen": "#8E6BBF", "Agent": "#2F7DBE", "Enquêteur": "#1E9E8A", "Chef de service / Commissaire": "#C8832A",
    "Délégué provincial": "#B5492E", "Direction générale": "#0B2340", "Système": "#6B7785", "Autorité judiciaire": "#7A5C3E",
    "Administration": "#4B5D9C", "RH": "#3C8D5A", "Finance": "#A0446B",
}
def color_of(actor):
    for k, v in ACTOR_COLORS.items():
        if actor.startswith(k):
            return v
    return "#4A6076"

def wrap(draw, text, fnt, width):
    out, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            line = t
        else:
            if line:
                out.append(line)
            line = w
    if line:
        out.append(line)
    return out or [""]

def render(title, steps, path, width=980):
    f_t, f_a, f_b, f_s = font(22, True), font(13, True), font(15), font(13, True)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    bw, pad, gap, x0 = 760, 14, 30, (width - 760) // 2
    laid, y = [], 70
    for st in steps:
        lines = wrap(probe, st["t"], f_b, bw - 2 * pad - (30 if st.get("k") == "decision" else 0))
        h = pad * 2 + 20 + len(lines) * 20 + (22 if st.get("s") else 0)
        laid.append((st, lines, y, h))
        y += h + gap
    H = y + 20
    img = Image.new("RGB", (width, H), "white")
    d = ImageDraw.Draw(img)
    d.text((width // 2, 28), title, font=f_t, fill="#0B2340", anchor="mm")
    d.line([(40, 52), (width - 40, 52)], fill="#C9A227", width=3)
    for i, (st, lines, yy, h) in enumerate(laid):
        col = color_of(st["a"])
        k = st.get("k", "step")
        box = [x0, yy, x0 + bw, yy + h]
        if k == "end":
            d.rounded_rectangle(box, radius=h // 2 if h < 70 else 26, fill="#EAF3EC", outline="#3C8D5A", width=3)
        elif k == "decision":
            d.rounded_rectangle(box, radius=10, fill="#FFF6DD", outline="#C9A227", width=3)
            d.polygon([(x0, yy + h // 2), (x0 + 22, yy + h // 2 - 12), (x0 + 22, yy + h // 2 + 12)], fill="#C9A227")
        elif k == "system":
            d.rounded_rectangle(box, radius=10, fill="#F1F3F5", outline="#6B7785", width=2)
        else:
            d.rounded_rectangle(box, radius=10, fill="#F7FAFD", outline=col, width=2)
        d.rectangle([x0 + 1, yy + 8, x0 + 7, yy + h - 8], fill=col)
        d.text((x0 + pad + 6, yy + pad), f"{i + 1}.  {st['a']}", font=f_a, fill=col)
        ty = yy + pad + 22
        for ln in lines:
            d.text((x0 + pad + 6 + (22 if k == "decision" else 0), ty), ln, font=f_b, fill="#1B2733")
            ty += 20
        if st.get("s"):
            d.text((x0 + pad + 6, ty + 2), "Statut : " + st["s"], font=f_s, fill="#0B2340")
        if i < len(laid) - 1:
            ax = width // 2
            d.line([(ax, yy + h), (ax, yy + h + gap - 7)], fill="#4A6076", width=3)
            d.polygon([(ax - 7, yy + h + gap - 9), (ax + 7, yy + h + gap - 9), (ax, yy + h + gap)], fill="#4A6076")
    img.save(path)

def mermaid(title, steps):
    def esc(s):
        return s.replace('"', "'")
    out = ["```mermaid", "flowchart TD"]
    for i, st in enumerate(steps):
        lab = f'{esc(st["a"])}<br/>{esc(st["t"])}' + (f'<br/><b>Statut : {esc(st["s"])}</b>' if st.get("s") else "")
        k = st.get("k", "step")
        node = f'  N{i}{{"{lab}"}}' if k == "decision" else (f'  N{i}(["{lab}"])' if k == "end" else f'  N{i}["{lab}"]')
        out.append(node)
    for i in range(len(steps) - 1):
        out.append(f"  N{i} --> N{i + 1}")
    out.append("```")
    return "\n".join(out)
