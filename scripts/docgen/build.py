# -*- coding: utf-8 -*-
"""Génère SIGEC_PN_DOCUMENTATION : python scripts/docgen/build.py [--no-convert]
Prérequis : npx tsx scripts/docgen/dump.ts (catalogue des rôles/droits en lecture seule)."""
import shutil, sys, time
from concurrent.futures import ThreadPoolExecutor
from lib import *
import gen_profiles, gen_docs, gen_more, gen_end, mdout

def main(convert=True):
    o = Out()
    gen_docs.prep_assets()
    gen_more.build_general(o)
    gen_profiles.build(o)
    gen_docs.build_modules(o)
    gen_docs.build_workflows(o)
    gen_more.build_matrices(o)
    gen_end.build_training(o)
    gen_end.build_annexes(o)
    print(len(o.docs), "documents Markdown")
    if not convert:
        return
    def conv(item):
        md, land = item
        ok1 = mdout.to_pdf(md, md.with_suffix(".pdf"), land)
        try:
            mdout.to_docx(md, md.with_suffix(".docx"), land); ok2 = True
        except Exception as e:
            print("DOCX FAIL", md.name, e); ok2 = False
        return md, ok1, ok2
    t = time.time()
    with ThreadPoolExecutor(4) as ex:
        res = list(ex.map(conv, o.docs))
    bad = [(m.name, a, b) for m, a, b in res if not (a and b)]
    print("converti en", round(time.time() - t), "s ; échecs :", bad)
    dst = ROOT / "_build" / "md"
    for md, _ in o.docs:
        rel = md.relative_to(ROOT)
        (dst / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(md), str(dst / rel))

if __name__ == "__main__":
    main("--no-convert" not in sys.argv)
