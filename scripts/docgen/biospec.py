# -*- coding: utf-8 -*-
"""Diagrammes et PDF/Word de la spécification d'évolution du module biométrique (docs/biometrie). Outil de documentation uniquement."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
import flow, mdout

DOC = Path(r"C:\Users\DELL\pms\docs\biometrie")
IMG = DOC / "img"
IMG.mkdir(parents=True, exist_ok=True)

GREY, ORANGE, BLUE = ("#EEF1F4", "#6B7785"), ("#FFF1DD", "#C8832A"), ("#E3EEFB", "#1E5AA8")

def wrapl(d, text, fnt, w):
    return flow.wrap(d, text, fnt, w)

def architecture(path):
    W = 1500
    f_t, f_h, f_b = flow.font(26, True), flow.font(16, True), flow.font(14)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    layers = [
        ("PRÉSENTATION — navigateur de l'agent", [("Écrans existants : /biometric, /biometric/control, historique", GREY), ("Bandeau DEMO (conservé tant qu'un fournisseur est de démonstration)", ORANGE), ("Écrans nouveaux : fournisseurs et appareils, revue des indications, conservation et effacement, santé", BLUE)]),
        ("API — /api/v1/biometric/*  (authentification, permission, périmètre, limitation de débit, audit)", [("Routes existantes (12) : enrôlement, recherche, plaque, historique, contrôle", GREY), ("Routes nouvelles : jobs, reviews, hits, providers, devices, keys, retention, erasure-requests, health, anpr/ingest, webhooks", BLUE)]),
        ("SERVICES MÉTIER", [("Orchestration : porte d'entrée (affaire + motif + agent), périmètre, audit — service.ts / control.ts", GREY), ("Revue indépendante (relecteur ≠ opérateur ≠ demandeur)", BLUE), ("Lien avis de recherche / registre des véhicules", BLUE), ("Conservation et effacement", BLUE), ("Service de clés (DEK / KEK)", BLUE)]),
        ("PASSERELLE FOURNISSEURS — contrat types.ts (4 interfaces conservées) + extensions optionnelles", [("Registre, délais, coupe-circuit, verrou « environnement de démonstration »", BLUE), ("Mock* (empreinte, visage, voix, plaque) — DEMO, conservés", ORANGE), ("Adaptateur AFIS", BLUE), ("Adaptateur reconnaissance faciale", BLUE), ("Adaptateur ANPR", BLUE), ("Pont d'appareils (service local signé)", BLUE)]),
        ("DONNÉES ET SÉCURITÉ", [("PostgreSQL : gabarits chiffrés, historique en écriture unique, tâches, revues, indications", GREY), ("Journal d'audit à chaîne de hachage (append-only)", GREY), ("Stockage des preuves + chaîne de possession", GREY), ("HSM / service de clés (KEK) — nouveau", BLUE)]),
        ("SYSTÈMES EXTERNES ET ÉQUIPEMENTS (zone réseau dédiée, TLS mutuel)", [("Moteur AFIS (sur site)", BLUE), ("Moteur facial (sur site)", BLUE), ("Caméras ANPR", BLUE), ("Lecteurs d'empreintes / caméras de portrait", BLUE), ("Avis de recherche, registre des véhicules (existants)", GREY)]),
    ]
    y, rows = 80, []
    pad, gap = 12, 14
    for title, boxes in layers:
        n = len(boxes)
        bw = (W - 80 - (n - 1) * gap) // n
        hs = [len(wrapl(probe, t, f_b, bw - 2 * pad)) * 19 + 2 * pad for t, _ in boxes]
        h = max(hs)
        rows.append((title, boxes, y, bw, h))
        y += 30 + h + 34
    H = y + 70
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.text((W // 2, 34), "Architecture technique cible — module biométrique SIGPN-T", font=f_t, fill="#0B2340", anchor="mm")
    d.line([(40, 60), (W - 40, 60)], fill="#C9A227", width=3)
    for i, (title, boxes, yy, bw, h) in enumerate(rows):
        d.text((40, yy), title, font=f_h, fill="#0B2340")
        x = 40
        for t, (fill, edge) in boxes:
            d.rounded_rectangle([x, yy + 26, x + bw, yy + 26 + h], radius=8, fill=fill, outline=edge, width=2)
            ty = yy + 26 + pad
            for ln in wrapl(d, t, f_b, bw - 2 * pad):
                d.text((x + pad, ty), ln, font=f_b, fill="#1B2733")
                ty += 19
            x += bw + gap
        if i < len(rows) - 1:
            ax = W // 2
            top = yy + 26 + h
            d.line([(ax, top), (ax, top + 32)], fill="#4A6076", width=3)
            d.polygon([(ax - 7, top + 24), (ax + 7, top + 24), (ax, top + 33)], fill="#4A6076")
    ly = H - 50
    x = 40
    for lab, (fill, edge) in (("Existant réel (conservé)", GREY), ("Existant simulé — DEMO (conservé)", ORANGE), ("À construire", BLUE)):
        d.rounded_rectangle([x, ly, x + 26, ly + 20], radius=4, fill=fill, outline=edge, width=2)
        d.text((x + 34, ly + 10), lab, font=f_b, fill="#1B2733", anchor="lm")
        x += 340
    img.save(path)

ID = [
    dict(a="Enquêteur", t="Demande une recherche : affaire dans son périmètre, motif ≥ 10 caractères. Le système vérifie la base légale valide et le fournisseur actif."),
    dict(a="Agent", t="Capture avec un appareil inscrit et signé (pont local) ; qualité normalisée (NFIQ 2 / ISO 29794-5) et vivacité vérifiées. Sinon : recapture demandée.", s="Capture acceptée"),
    dict(a="Système", k="system", t="Le fournisseur extrait le gabarit de la sonde (jamais un hachage). Recherche 1:1 ou 1:N dans la galerie du MOTEUR (tâche asynchrone).", s="Tâche en cours"),
    dict(a="Système", k="system", t="Résultat : candidats classés, scores, seuil et version du moteur enregistrés. Aucune décision automatique. Moteur indisponible = « service indisponible », jamais « aucune correspondance »."),
    dict(a="Système", k="system", t="Recoupement en lecture seule pour le relecteur : avis de recherche actif ? véhicule signalé ? (selon le périmètre ; sinon message générique)."),
    dict(a="Relecteur indépendant", k="decision", t="Un agent habilité DIFFÉRENT de l'opérateur et du demandeur compare et décide : confirmé / rejeté / non concluant, avec justification écrite (identité + validité de la procédure).", s="Décision humaine enregistrée"),
    dict(a="Chef de service / Commissaire", t="Notifié de façon générique (sans identité). L'action coercitive éventuelle relève de l'autorité compétente, avec contrôle du mandat : le système informe, il n'ordonne pas."),
    dict(a="Système", k="system", t="Historique en écriture unique + journal d'audit à chaîne de hachage. La sonde n'est pas conservée ; erreurs signalées → mesure de précision."),
    dict(a="Auditeur / DPO", k="end", t="Contrôle a posteriori : historique, périmètres, volumes par agent, indicateurs de précision, application de la conservation."),
]
ROAD = [
    dict(a="Phase 0 — Préalables", t="Cadre juridique, responsable de la protection des données, analyse d'impact, choix du fournisseur, hébergement. Aucune donnée biométrique.", s="Porte : autorisation institutionnelle + avis juridique"),
    dict(a="Phase 1 — Durcissement sans moteur", t="HSM/KMS, chiffrement par enveloppe, conservation, registre fournisseurs/appareils, revues indépendantes, séparation des environnements.", s="Porte : tests de sécurité et de non-régression verts"),
    dict(a="Phase 2 — Passerelle et contrats", t="Extensions de types.ts, simulateur de moteur étiqueté DEMO, suite de conformité, tâches asynchrones.", s="Porte : conformité 100 % sur le simulateur"),
    dict(a="Phase 3 — Laboratoire", t="Moteur du fournisseur en préproduction, données synthétiques ou volontaires consentants.", s="Porte : interopérabilité et performance mesurées"),
    dict(a="Phase 4 — Évaluation indépendante", t="Protocole ISO/IEC 19795, calibrage des seuils, essais de vivacité.", s="Porte : rapport conforme, sinon arrêt"),
    dict(a="Phase 5 — Pilote en mode ombre", t="Un commissariat, moteur réel, résultats NON actionnables.", s="Porte : erreurs dans les limites, aucun incident"),
    dict(a="Phase 6 — Pilote opérationnel", t="Résultats actionnables avec revue indépendante, supervision renforcée.", s="Porte : décision de la Direction"),
    dict(a="Phase 7 — Extension provinciale", t="Quelques provinces, formation, appareils, assistance.", s="Porte : indicateurs stables, audit externe"),
    dict(a="Phase 8 — Généralisation", t="Toutes les provinces ; évaluation annuelle de précision et de conformité.", k="end"),
]

architecture(IMG / "architecture_composants.png")
flow.render("Workflow d'identification biométrique (cible)", ID, IMG / "workflow_identification.png")
flow.render("Déploiement progressif du module biométrique", ROAD, IMG / "deploiement_progressif.png")

if "--convert" in sys.argv:
    md = DOC / "SPEC_EVOLUTION_BIOMETRIQUE.md"
    sys.path.insert(0, str(mdout.MD2PDF.parent))
    import md2pdf
    md2pdf.convert(md, md.with_suffix(".pdf"), False, base=DOC)
    mdout.to_docx(md, md.with_suffix(".docx"))
    print("ok")
