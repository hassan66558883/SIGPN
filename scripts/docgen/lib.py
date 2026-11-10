# -*- coding: utf-8 -*-
import json, re, shutil, os
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from c_perms import *
import c_roles as R

PMS = Path(r"C:\Users\DELL\pms")
ROOT = PMS / "SIGEC_PN_DOCUMENTATION"
CAT = json.load(open(ROOT / "_build" / "catalog.json", encoding="utf-8"))
ROLES = {r["code"]: r for r in CAT["roles"]}
# droits EFFECTIFS lus (en lecture seule) dans la base de démonstration : le code des rôles + les droits ajoutés à la synchronisation (alertes, site public, biométrie)
_DB = json.load(open(ROOT / "_build" / "db_roles_demo.json", encoding="utf-8"))
for _c, _r in ROLES.items():
    _st = set(_r["permissions"])
    assert _st <= set(_DB[_c]["perms"]), _c
    _r["permissions"] = sorted(set(_DB[_c]["perms"]))
ROLE_ORDER = [r["code"] for r in CAT["roles"]]
PERM_DESC = {c: d for c, d in CAT["permissions"]}
SENS = set(CAT["sensitive"])
ACCOUNTS = CAT["accounts"]
NAV = CAT["navigation"]
DATE = "10 novembre 2026"
VERSION = "1.0"

# libellés français de l'interface
LAB = {}
for f in list((PMS / "src/lib/i18n").glob("*.fr.ts")) + [PMS / "src/lib/i18n/fr.ts"]:
    for k, v in re.findall(r'"([A-Za-z0-9_.]+)":\s*"((?:[^"\\]|\\.)*)"', f.read_text(encoding="utf-8")):
        LAB.setdefault(k, v.replace('\\"', '"'))

def rperms(code):
    return set(ROLES[code]["permissions"])

def nav_for(code):
    """Entrées de menu visibles (comme le fait layout.tsx), regroupées par rubrique."""
    p = rperms(code)
    out = []
    for sec in NAV:
        items = [LAB.get(i["labelKey"], i["labelKey"]) for i in sec["items"] if not i.get("planned") and (i["permission"] in p or any(x in p for x in (i.get("anyOf") or [])))]
        if items:
            out.append((LAB.get(sec["titleKey"], "") if sec["titleKey"] else "Général", items))
    return out

def nav_all():
    rows = []
    for sec in NAV:
        for i in sec["items"]:
            rows.append((LAB.get(sec["titleKey"], "Général") if sec["titleKey"] else "Général", LAB.get(i["labelKey"], i["labelKey"]), i["href"], i["permission"], "Prévu, non construit" if i.get("planned") else "Disponible"))
    return rows

def table(headers, rows):
    s = "| " + " | ".join(headers) + " |\n|" + "|".join("---" for _ in headers) + "|\n"
    for r in rows:
        s += "| " + " | ".join(str(c).replace("|", "/").replace("\n", " ") for c in r) + " |\n"
    return s

def bullets(items):
    return "".join(f"- {i}\n" for i in items)

def numbered(items):
    return "".join(f"{n}. {i}\n" for n, i in enumerate(items, 1))

class Out:
    def __init__(self):
        self.docs = []  # (md_path, landscape)
    def write(self, rel, text, landscape=False):
        p = ROOT / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
        self.docs.append((p, landscape))
        return p

def front(title, subtitle, extra=""):
    return (f"# {title}\n\n**{subtitle}**\n\n"
            + table(["Rubrique", "Valeur"], [("Système", "SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad"), ("Éditeur et développeur", "TECHNOTCHAD"), ("Version du document", f"{VERSION} — {DATE}"), ("Statut", "Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions"), ("Source des informations", "Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié")])
            + (extra or "") + "\n")

def shot(rel_from, name, cap):
    return f"![{cap}]({rel_from}/07_ANNEXES/captures/{name})\n\n"

def screens(depth, lst):
    """depth = nombre de dossiers entre le document et la racine du livrable"""
    pre = "/".join([".."] * depth) if depth else "."
    return "".join(f"![{c}]({pre}/07_ANNEXES/captures/{n})\n\n" for n, c in lst if (ROOT / "07_ANNEXES/captures" / n).exists())

def accounts_of(code):
    return [a["username"] for a in ACCOUNTS if a["roleCode"] == code]

def groups_of(perms):
    g = {}
    for c in perms:
        g.setdefault(c.split(":")[0], []).append(c)
    order = list(MOD.keys())
    return [(m, sorted(g[m], key=lambda x: (VERB_ORDER.index(x.split(":")[1]) if x.split(":")[1] in VERB_ORDER else 99, x))) for m in sorted(g, key=lambda m: order.index(m) if m in order else 99)]
