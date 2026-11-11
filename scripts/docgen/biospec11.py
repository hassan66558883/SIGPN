# -*- coding: utf-8 -*-
"""Diagrammes et PDF/Word de la spécification biométrique version 1.1 (docs/biometrie). Outil de documentation uniquement."""
import re, sys, math
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
import flow, mdout

DOC = Path(r"C:\Users\DELL\pms\docs\biometrie")
IMG = DOC / "img"
IMG.mkdir(parents=True, exist_ok=True)
G, O, B = ("#EEF1F4", "#6B7785"), ("#FFF1DD", "#C8832A"), ("#E3EEFB", "#1E5AA8")
COL = {"g": G, "o": O, "b": B}

# ------------------------------------------------------------------ architecture par couches
def layered(path, title, layers, W=1500):
    f_t, f_h, f_b = flow.font(26, True), flow.font(16, True), flow.font(14)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    y, rows, pad, gap = 80, [], 12, 14
    for t, boxes in layers:
        n = len(boxes); bw = (W - 80 - (n - 1) * gap) // n
        h = max(len(flow.wrap(probe, x, f_b, bw - 2 * pad)) * 19 + 2 * pad for x, _ in boxes)
        rows.append((t, boxes, y, bw, h)); y += 30 + h + 34
    H = y + 70
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    d.text((W // 2, 34), title, font=f_t, fill="#0B2340", anchor="mm"); d.line([(40, 60), (W - 40, 60)], fill="#C9A227", width=3)
    for i, (t, boxes, yy, bw, h) in enumerate(rows):
        d.text((40, yy), t, font=f_h, fill="#0B2340"); x = 40
        for txt, c in boxes:
            fill, edge = COL[c]
            d.rounded_rectangle([x, yy + 26, x + bw, yy + 26 + h], radius=8, fill=fill, outline=edge, width=2)
            ty = yy + 26 + pad
            for ln in flow.wrap(d, txt, f_b, bw - 2 * pad):
                d.text((x + pad, ty), ln, font=f_b, fill="#1B2733"); ty += 19
            x += bw + gap
        if i < len(rows) - 1:
            ax, top = W // 2, yy + 26 + h
            d.line([(ax, top), (ax, top + 32)], fill="#4A6076", width=3); d.polygon([(ax - 7, top + 24), (ax + 7, top + 24), (ax, top + 33)], fill="#4A6076")
    lx = 40
    for lab, c in (("Existant réel (conservé)", "g"), ("Existant simulé — DEMO (conservé)", "o"), ("À construire", "b")):
        fill, edge = COL[c]; d.rounded_rectangle([lx, H - 50, lx + 26, H - 30], radius=4, fill=fill, outline=edge, width=2)
        d.text((lx + 34, H - 40), lab, font=f_b, fill="#1B2733", anchor="lm"); lx += 340
    img.save(path)

# ------------------------------------------------------------------ graphe de blocs et de flèches
def graph(path, title, W, H, nodes, edges, legend=True):
    f_t, f_b, f_s = flow.font(24, True), flow.font(14, True), flow.font(12)
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    d.text((W // 2, 30), title, font=f_t, fill="#0B2340", anchor="mm"); d.line([(40, 56), (W - 40, 56)], fill="#C9A227", width=3)
    def edge_pt(n, dx, dy):
        cx, cy, hw, hh = n["x"] + n["w"] / 2, n["y"] + n["h"] / 2, n["w"] / 2, n["h"] / 2
        tx = hw / abs(dx) if dx else 1e9; ty = hh / abs(dy) if dy else 1e9; t = min(tx, ty)
        return cx + dx * t, cy + dy * t
    for a, b, lab, style in edges:
        na, nb = nodes[a], nodes[b]
        ca = (na["x"] + na["w"] / 2, na["y"] + na["h"] / 2); cb = (nb["x"] + nb["w"] / 2, nb["y"] + nb["h"] / 2)
        dx, dy = cb[0] - ca[0], cb[1] - ca[1]
        p1 = edge_pt(na, dx, dy); p2 = edge_pt(nb, -dx, -dy)
        d.line([p1, p2], fill="#4A6076", width=2)
        def head(p, q):
            ang = math.atan2(p[1] - q[1], p[0] - q[0]); s = 10
            d.polygon([p, (p[0] - s * math.cos(ang - 0.4), p[1] - s * math.sin(ang - 0.4)), (p[0] - s * math.cos(ang + 0.4), p[1] - s * math.sin(ang + 0.4))], fill="#4A6076")
        head(p2, p1)
        if style == "both": head(p1, p2)
        if lab:
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2; w = d.textlength(lab, font=f_s)
            d.rectangle([mx - w / 2 - 3, my - 8, mx + w / 2 + 3, my + 8], fill="white"); d.text((mx, my), lab, font=f_s, fill="#0B2340", anchor="mm")
    for n in nodes.values():
        fill, edge = COL[n["c"]]
        d.rounded_rectangle([n["x"], n["y"], n["x"] + n["w"], n["y"] + n["h"]], radius=8, fill=fill, outline=edge, width=2)
        lines = [x for part in n["t"].split(chr(10)) for x in flow.wrap(d, part, f_b, n["w"] - 16)]; ty = n["y"] + n["h"] / 2 - len(lines) * 9
        for ln in lines:
            d.text((n["x"] + n["w"] / 2, ty + 9), ln, font=f_b, fill="#1B2733", anchor="mm"); ty += 18
    if legend:
        lx = 40
        for lab, c in (("Existant réel", "g"), ("Existant simulé — DEMO", "o"), ("À construire", "b")):
            fill, edge = COL[c]; d.rounded_rectangle([lx, H - 38, lx + 24, H - 18], radius=4, fill=fill, outline=edge, width=2)
            d.text((lx + 32, H - 28), lab, font=f_s, fill="#1B2733", anchor="lm"); lx += 260
    img.save(path)

def N(x, y, w, h, t, c="b"):
    return dict(x=x, y=y, w=w, h=h, t=t, c=c)

# ------------------------------------------------------------------ 1. architecture v1.1
ARCH = [
    ("PRÉSENTATION — navigateur de l'agent", [("Écrans existants : /biometric, /biometric/control, historique", "g"), ("Bandeau DEMO (conservé, retiré fournisseur par fournisseur)", "o"), ("Écrans nouveaux : fournisseurs et appareils, revue et réservoir, indications, conservation et effacement, santé", "b")]),
    ("API — /api/v1/biometric/*  (authentification, permission, périmètre, limitation de débit, audit)", [("12 routes existantes, contrats inchangés — deviennent des ENVELOPPES MINCES de l'orchestrateur", "g"), ("Routes nouvelles : captures, jobs, reviews, enrollments, hits, providers, devices, keys, retention, erasure, portability, subjects, identity-events, health", "b"), ("Webhooks fournisseurs : /api/v1/webhooks/biometric/{provider} (signés, idempotents)", "b")]),
    ("ORCHESTRATION ET SERVICES MÉTIER", [("ORCHESTRATEUR unique : porte d'entrée (affaire ouverte, cible partie à l'affaire, base légale), périmètre, audit, choix du chemin DEMO ou réel", "b"), ("Revue indépendante + réservoir de relecteurs (unité → province → national)", "b"), ("Surveillance des listes : plaques canoniques, avis, registre des véhicules", "b"), ("Sujets, liens et événements d'identité", "b"), ("Conservation, effacement, registre d'effacement", "b")]),
    ("COFFRE ET CLÉS (crypto.ts NON MODIFIÉ — le MFA reste intact)", [("Coffre biométrique : format bv1, clé de données par échantillon / gabarit", "b"), ("Service de clés : adaptateur DEV (mode demo seulement) / HSM", "b"), ("Génération de clés maîtresses, ré-enveloppement annuel, double contrôle", "b"), ("crypto.ts + auth/login.ts (MFA) — non modifiés", "g")]),
    ("PASSERELLE FOURNISSEURS — 4 interfaces de types.ts conservées + extensions optionnelles", [("Registre, délais, coupe-circuit, plafond BIOMETRIC_MODE, cohérence avec la base", "b"), ("Mock* (empreinte, visage, voix, plaque) — DEMO, inchangés", "o"), ("Adaptateur AFIS", "b"), ("Adaptateur facial", "b"), ("Adaptateur ANPR", "b"), ("Pont d'appareils (service local, capture signée)", "b"), ("Connecteur DUN (DEMO d'abord)", "b")]),
    ("DONNÉES ET AUDIT", [("Chemin DEMO : FingerprintRecord / FaceRecord / VoiceRecord (DEMO_SHA256 verrouillé), BiometricSearch, BiometricControl", "o"), ("Chemin réel : Subject, Sample, Template, Enrollment, Capture, Review, Job, WatchHit…", "b"), ("Journal d'audit à chaîne de hachage ; preuves et chaîne de possession", "g"), ("HSM / service de clés externe", "b")]),
    ("SYSTÈMES EXTERNES (zone réseau dédiée, TLS mutuel)", [("Moteur AFIS (sur site)", "b"), ("Moteur facial (sur site)", "b"), ("Caméras ANPR, lecteurs d'empreintes, caméras de portrait", "b"), ("Dossier unique national (futur)", "b"), ("Avis de recherche, registre des véhicules, personnes (existants)", "g")]),
]
layered(IMG / "architecture_composants_v11.png", "Architecture technique cible v1.1 — module biométrique SIGPN-T", ARCH)

# ------------------------------------------------------------------ 2. modèle de données v1.1
nodes = {
    "person": N(40, 90, 230, 60, "Person (fiche locale)", "g"),
    "link": N(330, 90, 280, 60, "BiometricSubjectLink  (fiche locale · identifiant DUN · pseudonyme)"),
    "dun": N(700, 90, 230, 60, "Dossier unique national (futur)"),
    "subject": N(330, 230, 280, 60, "BiometricSubject  (identifiant stable)"),
    "idev": N(700, 230, 260, 60, "BiometricIdentityEvent  (fusion · scission · décès)"),
    "sample": N(40, 380, 250, 80, "BiometricSample  (échantillon de référence chiffré bv1 · vivacité · qualité)"),
    "tmpl": N(340, 380, 270, 80, "BiometricTemplate  (NORMALISÉ ISO 19794-2 + PROPRIÉTAIRE, chiffrés bv1)"),
    "enr": N(660, 380, 250, 80, "BiometricEnrollment  (une ligne par fournisseur et galerie)"),
    "prov": N(960, 380, 240, 80, "BiometricProvider  (isDemo fait foi · statut)"),
    "legal": N(40, 540, 250, 80, "BiometricLegalBasis · RetentionPolicy · RetentionEvent · ErasureRegister"),
    "cap": N(340, 540, 230, 60, "BiometricCapture  (signée · nonce · ≤ 15 min)"),
    "dev": N(340, 650, 230, 50, "BiometricDevice  (certificat)"),
    "key": N(660, 540, 250, 60, "BiometricKey  (génération · métadonnées seulement)"),
    "match": N(40, 780, 220, 80, "BiometricMatch  (existant ; + subjectId, scoreRaw)", "g"),
    "search": N(330, 780, 270, 80, "BiometricSearch  (existant, écriture seule ; + requestedById, provider, seuil)", "g"),
    "review": N(670, 780, 250, 80, "BiometricReview  (décision UNIQUE · insertion seule · ≠ opérateur ≠ demandeur)"),
    "hit": N(990, 780, 250, 80, "BiometricWatchHit  (plaques canoniques · avis · véhicules)"),
    "job": N(330, 900, 270, 60, "BiometricJob  (asynchrone · idempotence)"),
    "legacy": N(720, 900, 520, 60, "Chemin DEMO inchangé : FingerprintRecord · FaceRecord · VoiceRecord (DEMO_SHA256, CHECK)", "o"),
}
edges = [("person", "link", "", "arrow"), ("link", "subject", "", "arrow"), ("dun", "link", "identifiant DUN", "arrow"), ("subject", "idev", "", "both"),
         ("subject", "sample", "", "arrow"), ("sample", "tmpl", "", "arrow"), ("tmpl", "enr", "", "arrow"), ("enr", "prov", "", "arrow"),
         ("legal", "sample", "", "arrow"), ("cap", "sample", "", "arrow"), ("dev", "cap", "", "arrow"), ("key", "tmpl", "DEK enveloppée", "arrow"),
         ("search", "match", "", "arrow"), ("search", "review", "", "arrow"), ("search", "job", "", "arrow"), ("hit", "review", "revue", "arrow")]
graph(IMG / "modele_donnees_v11.png", "Modèle de données v1.1 — sujet, échantillon, gabarit, inscription", 1300, 1000, nodes, edges)

# ------------------------------------------------------------------ 3. interopérabilité DUN
n2 = {
    "dun": N(40, 120, 300, 110, "DOSSIER UNIQUE NATIONAL (futur)\nMaître de l'identité civile"),
    "conn": N(480, 120, 340, 110, "CONNECTEUR VERSIONNÉ  NationalRegistryConnector\nresolveIdentity · événements · attest (oui/non)\nConnecteur DEMO fourni", "b"),
    "local": N(960, 60, 280, 70, "Person (fiche locale)  —  existant", "g"),
    "link": N(960, 160, 280, 70, "BiometricSubjectLink  (pseudonyme propre à SIGPN-T)"),
    "subj": N(960, 260, 280, 70, "BiometricSubject  (identifiant stable)"),
    "ev": N(500, 330, 300, 80, "BiometricIdentityEvent\nPERSON_MERGED · PERSON_SPLIT · PERSON_DECEASED"),
    "merge": N(40, 330, 330, 80, "persons/service.ts : mergePersons\nÉMET un événement (modification minime)", "g"),
    "afis": N(960, 390, 280, 70, "Inscriptions moteur (par fournisseur)"),
    "rev": N(500, 470, 300, 80, "Revue humaine : doublons de sujets, conflits de fusion"),
    "rule": N(40, 470, 330, 90, "Règles : fiche fusionnée ou décédée = enrôlement refusé ; fusion = changement de lien, JAMAIS de déplacement de gabarit", "g"),
}
e2 = [("dun", "conn", "identité · fusions", "both"), ("conn", "link", "résolution", "arrow"), ("link", "local", "", "arrow"), ("link", "subj", "", "arrow"), ("merge", "ev", "", "arrow"),
      ("conn", "ev", "événements du DUN", "arrow"), ("ev", "subj", "repointe les liens", "arrow"), ("ev", "rev", "conflits", "arrow"), ("subj", "afis", "", "arrow")]
graph(IMG / "interop_dun_v11.png", "Interopérabilité avec le Dossier unique national — fédération", 1300, 640, n2, e2)

# ------------------------------------------------------------------ 4. hiérarchie des clés
n3 = {
    "hsm": N(40, 100, 260, 90, "HSM / service de clés externe\n(KEK : une génération par année)"),
    "k1": N(380, 70, 260, 90, "KEK génération N-1\n(détruite après ré-enveloppement + expiration des sauvegardes)"),
    "k2": N(380, 185, 260, 50, "KEK génération N (courante)"),
    "dek": N(720, 100, 280, 90, "DEK par échantillon / gabarit\n(enveloppée dans l'enregistrement : wrappedDek, kekId, cipherVersion)"),
    "rec": N(1080, 100, 280, 90, "Échantillon / gabarit chiffré  bv1\nAES-256-GCM"),
    "bk": N(760, 330, 300, 90, "Sauvegardes chiffrées — clés PROPRES\nconservées ≤ 35 jours puis clés détruites"),
    "reg": N(380, 330, 300, 90, "Registre d'effacement (identifiants seulement)\nrejoué à CHAQUE restauration avant remise en service"),
    "er": N(40, 330, 280, 90, "Effacement anticipé : clé enveloppée supprimée + suppression côté moteur avec preuve"),
    "rewrap": N(720, 230, 280, 60, "Ré-enveloppement annuel des enregistrements actifs"),
}
e3 = [("hsm", "k1", "", "arrow"), ("hsm", "k2", "", "arrow"), ("k2", "dek", "enveloppe", "arrow"), ("dek", "rec", "chiffre", "arrow"), ("k2", "rewrap", "", "arrow"), ("rewrap", "dek", "", "arrow"),
      ("er", "reg", "inscrit", "arrow"), ("reg", "bk", "rejeu", "arrow"), ("rec", "bk", "copie chiffrée", "arrow")]
graph(IMG / "hierarchie_cles_v11.png", "Hiérarchie des clés, sauvegardes et effacement (C-01, C-04)", 1420, 520, n3, e3)

# ------------------------------------------------------------------ 5. flux : identification, portabilité, déploiement
ID = [
    dict(a="Enquêteur", t="Demande : affaire OUVERTE, motif ≥ 10 car., base légale valide ; pour un 1:1 la cible doit être PARTIE à l'affaire (sinon autorisation exceptionnelle d'un superviseur, journalisée)."),
    dict(a="Agent", t="Capture avec un appareil inscrit : capture SIGNÉE (nonce, certificat) ; qualité normalisée et vivacité. Sinon recapture.", s="Capture acceptée"),
    dict(a="Système", k="system", t="L'orchestrateur choisit le chemin (DEMO ou réel) selon le fournisseur ; extraction par le fournisseur (jamais un hachage) ; 1:1 ou 1:N dans la galerie du MOTEUR (asynchrone)."),
    dict(a="Système", k="system", t="Résultat : candidats, indice de rang, score brut, seuil, version moteur. Jamais de décision automatique ; indisponible ≠ aucune correspondance.", s="NO_CANDIDATE / REVIEW_REQUIRED / UNAVAILABLE"),
    dict(a="Système", k="system", t="Recoupement en lecture seule pour le relecteur : avis actif ? véhicule signalé ? (plaques canoniques, selon le périmètre)."),
    dict(a="Relecteur indépendant", k="decision", t="Affecté : autre agent habilité ≠ opérateur ≠ demandeur (imposé EN BASE). Niveau 1 : unité (24 h) → niveau 2 : province (48 h) → niveau 3 : national. Voie d'urgence : revue sous 24 h.", s="Décision UNIQUE (insertion seule)"),
    dict(a="Chef de service / Commissaire", t="Notifié de façon générique. L'action coercitive éventuelle relève de l'autorité compétente (contrôle du mandat) : le système informe, il n'ordonne pas."),
    dict(a="Système", k="system", t="Historique en écriture seule + audit à chaîne de hachage. La sonde n'est pas conservée. Alertes d'anomalie vers le DPO."),
    dict(a="Auditeur / DPO", k="end", t="Contrôle a posteriori ; visibilité des candidats limitée aux personnes autorisées (lignes réelles)."),
]
flow.render("Workflow d'identification biométrique v1.1", ID, IMG / "workflow_identification_v11.png")

PORT = [
    dict(a="Direction générale", t="Décision de changement (comité) ; clause de sortie du fournisseur sortant activée.", s="Décision signée"),
    dict(a="Administration", t="Nouveau fournisseur enregistré au statut « bac à sable » (BiometricProvider).", s="Enregistré"),
    dict(a="Système", k="system", t="Ré-inscription PAR LOT depuis les échantillons de référence (voie recommandée) ; à défaut depuis les gabarits normalisés (précision dégradée, mesurée).", s="Journal de lot"),
    dict(a="Système", k="system", t="MODE DOUBLE : les deux moteurs tournent ; seul l'ancien est actionnable ; comparaison des candidats sur la durée définie.", s="Rapport de concordance"),
    dict(a="Évaluateur indépendant", t="Évaluation indépendante du nouveau fournisseur (ISO/IEC 19795) sur le jeu local.", s="Rapport signé"),
    dict(a="Direction générale", k="decision", t="Approbation par deux profils différents ; bascule PAR MODALITÉ. Retour arrière possible tant que le double fonctionnement n'est pas validé.", s="Fournisseur ACTIF"),
    dict(a="Système", k="system", t="Retrait de l'ancien : suppression des inscriptions avec PREUVE du fournisseur.", s="Preuve de suppression"),
    dict(a="Administration", k="end", t="Destruction des gabarits propriétaires de l'ancien (suppression des clés) ; conservation du gabarit normalisé et des échantillons ; registre d'effacement.", s="Changement terminé"),
]
flow.render("Procédure de changement de fournisseur AFIS (8 étapes)", PORT, IMG / "portabilite_v11.png")

DEP = [
    dict(a="Phase 0 — Préalables", t="Avis juridique, DPO, analyse d'impact, PROTOCOLE du jeu de données d'évaluation, budget, hébergement, comité. Aucune donnée biométrique.", s="Sortie : D-01, D-04, D-07, D-16 décidées ; avis signé"),
    dict(a="Phase 1 — Durcissement sans moteur", t="Coffre et clés, écriture seule, BiometricReview, profils dédiés, séparation des environnements. Démonstration seulement.", s="Sortie : 0 régression (MFA, séparation), restauration RPO ≤ 24 h / RTO ≤ 4 h, 2 gardiens"),
    dict(a="Phase 2 — Passerelle et contrats", t="Extensions de types.ts, simulateur DEMO, conformité, sujets, connecteur DUN DEMO. Données synthétiques.", s="Sortie : conformité 100 %, changement de fournisseur simulé réussi"),
    dict(a="Phase 3 — Laboratoire (corrigée)", t="Moteur en préproduction sur site. DONNÉES SYNTHÉTIQUES OU SOUS LICENCE UNIQUEMENT — aucun volontaire sans D-01 et analyse d'impact.", s="Sortie : 1:1 p95 ≤ 2 s, 1:N p95 ≤ 10 s, disponibilité ≥ 99,5 %, 0 donnée dans les journaux"),
    dict(a="Phase 4 — Évaluation indépendante (4a / 4b)", t="4a : essais du fournisseur sur jeux sous licence. 4b : évaluation LOCALE sur le jeu constitué sous le protocole de la phase 0.", s="Sortie : FNMR, FPIR, écarts de groupes, vivacité dans les seuils ; sinon ARRÊT"),
    dict(a="Phase 5 — Pilote en mode ombre", t="Un commissariat, moteur réel, résultats NON actionnables ; personnes informées ; relecteurs désignés.", s="Sortie : ≥ 8 semaines, ≥ 500 recherches, 0 résultat actionné, 0 incident élevé"),
    dict(a="Phase 6 — Pilote opérationnel limité", t="Résultats actionnables avec revue indépendante systématique.", s="Sortie : 100 % revues indépendantes, faux positifs confirmés ≤ 0,5 %"),
    dict(a="Phase 7 — Extension provinciale", t="Province par province : appareils, formation, un relecteur au moins par province, politique hors ligne arrêtée.", s="Sortie : appareils 100 %, formés ≥ 95 %, audit externe"),
    dict(a="Phase 8 — Généralisation", t="Exploitation courante ; réévaluation annuelle ; test annuel de changement de fournisseur.", k="end", s="Revue annuelle de précision et de conformité"),
]
flow.render("Déploiement progressif v1.1 — neuf phases et portes", DEP, IMG / "deploiement_progressif_v11.png")

# ------------------------------------------------------------------ 6. tableau des décisions (parse du chapitre 18)
def decisions():
    txt = (DOC / "SPEC_EVOLUTION_BIOMETRIQUE_V1.1.md").read_text(encoding="utf-8")
    rows = [l for l in txt.splitlines() if l.startswith("| **D-")]
    rel = {"D-01": "C-15", "D-02": "C-01, C-05, C-09", "D-03": "C-05", "D-04": "C-03", "D-05": "C-02, C-07, C-08, C-11", "D-06": "C-04", "D-07": "C-06", "D-08": "C-09, C-14", "D-09": "C-11", "D-10": "C-15", "D-11": "C-06, C-15", "D-12": "—", "D-13": "C-01, C-15", "D-14": "C-15", "D-15": "C-04", "D-16": "C-15"}
    docs = {"D-01": "Avis juridique signé ; désignation de l'autorité de contrôle", "D-02": "Cahier des charges de l'appel d'offres", "D-03": "Avis juridique ; clauses contractuelles de portabilité", "D-04": "Décision écrite ; notes de nomination (DPO, 2 gardiens de clés, administrateur de plate-forme)",
            "D-05": "Note de service ; liste des relecteurs par province", "D-06": "Avis juridique sur les durées", "D-07": "Convention d'échange avec le porteur du DUN", "D-08": "Note opérationnelle", "D-09": "Note juridique", "D-10": "Cahier des charges de l'évaluation ; désignation de l'organisme",
            "D-11": "Décision écrite sur la population à enrôler", "D-12": "Décision écrite", "D-13": "Budget approuvé", "D-14": "Plan d'information ; procédure de contestation publiée", "D-15": "Procédure d'incident", "D-16": "Arrêté de nomination du comité et délégations de signature"}
    out = ["# SIGPN-T — Tableau des 16 décisions de la Direction (biométrie, version 1.1)", "",
           "**Police nationale du Tchad — Éditeur : TECHNOTCHAD — 11 novembre 2026 — Toutes les décisions sont EN ATTENTE**", "",
           "Les recommandations sont celles de l'éditeur ; elles ne sont **pas** des décisions. Aucune implémentation n'est autorisée tant que les décisions marquées « Phase 0 » et « Phase 1 » ne sont pas prises et que la version 1.1 n'a pas subi une nouvelle revue indépendante.", "",
           "| N° | Décision | Options | Recommandation de l'éditeur | Si la décision tarde ou est négative | Décideur | À prendre avant | Corrections liées | Documents requis | Statut |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        c = [x.strip() for x in r.strip().strip("|").split("|")]
        k = re.search(r"D-\d\d", c[0]).group(0)
        out.append("| " + " | ".join([c[0], c[1], c[2], c[3], c[4], c[5], c[6], rel[k], docs[k], "**EN ATTENTE**"]) + " |")
    return "\n".join(out) + "\n"

if "--convert" in sys.argv:
    sys.path.insert(0, str(mdout.MD2PDF.parent))
    import md2pdf
    md = DOC / "SPEC_EVOLUTION_BIOMETRIQUE_V1.1.md"
    md2pdf.convert(md, md.with_suffix(".pdf"), False, base=DOC)
    mdout.to_docx(md, md.with_suffix(".docx"))
    t = DOC / "TABLEAU_DECISIONS_V1.1.md"
    t.write_text(decisions(), encoding="utf-8")
    md2pdf.convert(t, t.with_suffix(".pdf"), True, base=DOC)
    mdout.to_docx(t, t.with_suffix(".docx"), landscape=True)
    print("ok")
