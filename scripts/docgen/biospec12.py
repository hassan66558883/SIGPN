# -*- coding: utf-8 -*-
"""Génère la spécification biométrique V1.2 : diagrammes, document, registres des décisions et des risques, traçabilité. Documentation uniquement."""
import math, re, sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
import flow, mdout
from bio12_data import ANOMALIES, STEPS, CH
from bio12_data2 import DECISIONS, RISKS, risk_class

DOC = Path(r"C:\Users\DELL\pms\docs\biometrie")
IMG = DOC / "img"
IMG.mkdir(parents=True, exist_ok=True)
G, O, B, R = ("#EEF1F4", "#6B7785"), ("#FFF1DD", "#C8832A"), ("#E3EEFB", "#1E5AA8"), ("#FBE8E6", "#B5492E")
COL = {"g": G, "o": O, "b": B, "r": R}

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
        for lab, c in (("Existant réel", "g"), ("Existant simulé / DEMO", "o"), ("À construire", "b"), ("Désactivé ou supprimé", "r")):
            fill, edge = COL[c]; d.rounded_rectangle([lx, H - 38, lx + 24, H - 18], radius=4, fill=fill, outline=edge, width=2)
            d.text((lx + 32, H - 28), lab, font=f_s, fill="#1B2733", anchor="lm"); lx += 240
    img.save(path)

def N(x, y, w, h, t, c="b"):
    return dict(x=x, y=y, w=w, h=h, t=t, c=c)

def diagrams():
    # 1. architecture
    n = {
        "nav": N(40, 90, 230, 60, "Navigateur de l'agent", "g"),
        "web": N(340, 90, 380, 80, "APPLICATION WEB — rôle pms_app SANS privilèges élevés ; AUCUN accès aux clés ni aux échantillons", "g"),
        "db": N(800, 90, 320, 70, "Base principale (SANS schéma biométrique)", "g"),
        "bk": N(1180, 90, 280, 70, "Sauvegarde principale (exclut la biométrie)", "g"),
        "svc": N(340, 270, 380, 110, "SERVICE BIOMÉTRIQUE (séparé : hôte, identité, réseau)\ncoffre · inscription · recherche · revue éphémère · effacement · registre", "b"),
        "bdb": N(800, 270, 320, 90, "Base biométrique dédiée (pms_bio)\ninsertion seule sur les tables d'historique", "b"),
        "bbk": N(1180, 270, 280, 90, "Sauvegarde biométrique ≤ 35 j\nclé enveloppée par le HSM, quorum 2/3", "b"),
        "hsm": N(40, 270, 230, 120, "HSM × 2 (deux sites)\nquorum 2 sur 3 · clés non exportables · signature · quotas", "b"),
        "dev": N(40, 470, 250, 80, "Pont d'appareils (service local)\ncaptures signées, certificat", "b"),
        "eng": N(400, 470, 320, 100, "Moteurs AFIS / facial — zone réseau SANS sortie\nle statut du fournisseur fixe les classes de données admises", "b"),
        "ext": N(800, 470, 350, 110, "STOCKAGE EXTERNE À ÉCRITURE SEULE (autre domaine d'administration)\nempreintes en temps réel · points de contrôle signés · registre d'effacement · journal des DDL", "b"),
        "tsa": N(1200, 470, 260, 70, "Tiers d'horodatage (RFC 3161) — ancrage quotidien", "b"),
        "dun": N(40, 650, 300, 80, "Dossier unique national (futur)\nconnecteur versionné : flux ENTRANTS seulement", "b"),
        "aud": N(800, 660, 350, 80, "Auditeur + responsable de la protection des données\nvérification quotidienne indépendante", "b"),
    }
    e = [("nav", "web", "HTTPS", "arrow"), ("web", "svc", "mTLS · API étroite", "arrow"), ("web", "db", "", "arrow"), ("db", "bk", "", "arrow"),
         ("svc", "bdb", "", "arrow"), ("bdb", "bbk", "", "arrow"), ("svc", "hsm", "quotas", "both"), ("svc", "eng", "", "arrow"), ("dev", "svc", "capture signée", "arrow"),
         ("svc", "ext", "empreintes · signatures", "arrow"), ("ext", "tsa", "", "arrow"), ("aud", "ext", "vérifie", "arrow"), ("dun", "svc", "identité", "arrow")]
    graph(IMG / "architecture_v12.png", "Architecture technique cible v1.2 — zones et frontières", 1500, 800, n, e)

    # 2. rôles PostgreSQL
    n = {
        "owner": N(520, 90, 300, 60, "pms_owner — NOLOGIN\npropriétaire des objets", "b"),
        "mig": N(60, 90, 300, 60, "pms_migrator — déploiement seul\nsecret injecté au travail de migration", "b"),
        "app": N(60, 280, 300, 80, "pms_app — application web\nSANS superutilisateur, DDL, TRIGGER, TRUNCATE", "b"),
        "bio": N(60, 440, 300, 70, "pms_bio — service biométrique\nbase dédiée", "b"),
        "bkp": N(60, 590, 300, 60, "pms_backup / pms_bio_backup\nlecture seule", "b"),
        "bg": N(520, 590, 300, 70, "pms_breakglass — SUPERUTILISATEUR\nscellé · double contrôle · alerte à chaque usage", "r"),
        "ro": N(960, 590, 300, 60, "pms_audit_ro — lecture des journaux", "b"),
        "t1": N(520, 280, 300, 70, "Tables ordinaires\nSELECT, INSERT, UPDATE, DELETE", "g"),
        "t2": N(960, 280, 340, 70, "Tables en écriture seule (AuditLog, CustodyEvent, Search…)\nSELECT, INSERT seulement", "g"),
        "t3": N(520, 440, 340, 70, "Schéma / base biométrique\nDML ; insertion seule sur l'historique et le registre", "b"),
        "ev": N(960, 90, 340, 80, "Déclencheurs d'événement DDL + journal d'audit de la base\nexpédiés hors de l'hôte", "b"),
    }
    e = [("mig", "owner", "SET ROLE", "arrow"), ("owner", "ev", "DDL surveillés", "arrow"), ("app", "t1", "DML", "arrow"), ("app", "t2", "INSERT seulement", "arrow"), ("bio", "t3", "DML limité", "arrow"),
         ("bkp", "t3", "lecture", "arrow"), ("ro", "t2", "lecture", "arrow")]
    graph(IMG / "roles_postgres_v12.png", "Rôles PostgreSQL et privilèges (A-01) — spécification", 1360, 720, n, e)

    # 3. registre chaîné et ancrage
    n = {
        "ins": N(40, 100, 280, 80, "Insertion d'une recherche, correspondance, revue, événement de contrôle, effacement", "g"),
        "trg": N(400, 100, 280, 80, "Fonction SECURITY DEFINER (non appelable par pms_app)\nrowHash canonique (RFC 8785)", "b"),
        "led": N(760, 100, 300, 80, "BiometricLedger — chaîne\nhash = SHA-256(prevHash‖seq‖type‖id‖rowHash‖date)", "b"),
        "rt": N(400, 290, 300, 80, "NIVEAU 1 — chaque hash expédié en TEMPS RÉEL\nvers un journal externe à écriture seule", "b"),
        "cp": N(760, 290, 300, 80, "NIVEAU 2 — point de contrôle SIGNÉ par le HSM\ntoutes les 15 minutes", "b"),
        "an": N(1120, 290, 300, 80, "NIVEAU 3 — ANCRAGE quotidien horodaté (tiers de confiance, RFC 3161)", "b"),
        "ext": N(400, 480, 360, 80, "Stockage externe à écriture seule\n(autre domaine d'administration)", "b"),
        "ver": N(820, 480, 340, 90, "Vérification quotidienne : chaîne + signatures + empreintes externes + ancrages\nAuditeur + DPO", "b"),
        "alt": N(1200, 480, 220, 90, "ÉCART = incident critique\nbascule suspendue", "r"),
    }
    e = [("ins", "trg", "", "arrow"), ("trg", "led", "", "arrow"), ("led", "rt", "", "arrow"), ("led", "cp", "", "arrow"), ("cp", "an", "", "arrow"), ("rt", "ext", "", "arrow"), ("cp", "ext", "", "arrow"), ("an", "ext", "", "arrow"), ("ext", "ver", "", "arrow"), ("ver", "alt", "", "arrow")]
    graph(IMG / "registre_ancrage_v12.png", "Intégrité cryptographique : registre chaîné, points de contrôle signés, ancrage (A-02, A-03)", 1460, 640, n, e)

    # 5. coffre
    n = {
        "web": N(40, 110, 260, 70, "Application web\nAUCUNE clé, AUCUN échantillon en clair", "g"),
        "svc": N(380, 90, 360, 120, "SERVICE BIOMÉTRIQUE\nreceiveCapture · enroll · search · reviewMaterial (éphémère, filigrané) · erase\nAUCUN déchiffrement en masse", "b"),
        "hsm": N(850, 90, 340, 120, "HSM × 2 — assurance FIPS 140-3 niveau 3 ou CC\nclés maîtresses (une génération par an) · signature · HMAC\nnon exportables", "b"),
        "q": N(380, 290, 360, 110, "QUOTAS DE DÉBALLAGE (service + politique du HSM)\n> 60 / minute : alerte · > 2 000 / jour : COUPE-CIRCUIT", "b"),
        "card": N(850, 290, 340, 100, "Quorum 2 sur 3 — cartes à puce\ngardiens ≥ 3 identités distinctes · rôles HSM séparés", "b"),
        "bk": N(40, 290, 260, 100, "Sauvegardes : clé enveloppée par le HSM\ndéchiffrables SEULEMENT avec le quorum", "b"),
        "alert": N(380, 470, 360, 80, "Alerte aux gardiens et au DPO ; incident critique", "r"),
        "fmt": N(850, 470, 340, 90, "Format bv2 : AES-256-GCM, une clé de données par objet\nDONNÉES AUTHENTIFIÉES ASSOCIÉES (table, id, kekId, version)", "b"),
        "cry": N(40, 470, 260, 80, "crypto.ts + MFA : NON MODIFIÉS", "g"),
    }
    e = [("web", "svc", "mTLS", "arrow"), ("svc", "hsm", "déballage", "both"), ("svc", "q", "", "arrow"), ("hsm", "card", "", "arrow"), ("q", "alert", "dépassement", "arrow")]
    graph(IMG / "coffre_service_v12.png", "Service biométrique, HSM, quotas et quorum (A-11, A-12, A-13)", 1250, 620, n, e)

    # 6. séparation des personnes
    n = {
        "id": N(40, 100, 300, 90, "StaffIdentity — PERSONNE PHYSIQUE\npièce vérifiée par deux agents RH (profils de gouvernance)", "b"),
        "off": N(420, 100, 260, 70, "Officer (fiche agent) — rattachée à une identité", "g"),
        "usr": N(760, 100, 300, 70, "User (un rôle par compte) — rattaché à la même identité", "g"),
        "rule": N(40, 290, 300, 110, "RÈGLES : un titulaire de gouvernance n'a AUCUN autre compte actif ; gardiens = ≥ 3 identités ; réconciliation hebdomadaire", "b"),
        "rev": N(420, 290, 300, 110, "Déclencheur de BiometricReview : opérateur ≠ demandeur ≠ relecteur AU NIVEAU DE L'IDENTITÉ", "b"),
        "pin": N(760, 290, 320, 110, "ÉPINGLAGE des droits de gouvernance : code d'édition de rôle + exécuteur d'approbation + DÉCLENCHEUR sur RolePermission", "b"),
        "app": N(420, 480, 340, 110, "Éligibilité PAR TYPE d'approbation : governance_approve ×2, deux identités, deux profils (commandement national + DPO) — approvals:decide seul = sans pouvoir", "b"),
        "boot": N(820, 480, 300, 110, "Amorçage : décision écrite de la Direction, cérémonie témoin, journal externe ; l'administrateur de sécurité ne crée ni n'attribue ces profils", "b"),
    }
    e = [("id", "off", "", "arrow"), ("off", "usr", "", "arrow"), ("id", "rule", "", "arrow"), ("usr", "pin", "", "arrow"), ("id", "rev", "", "arrow"), ("pin", "app", "", "arrow"), ("app", "boot", "", "arrow")]
    graph(IMG / "separation_personnes_v12.png", "Séparation des responsabilités au niveau des personnes physiques (A-19, A-20, A-21)", 1200, 680, n, e)

    # 9. fédération
    n = {
        "dun": N(40, 110, 300, 80, "DOSSIER UNIQUE NATIONAL (futur)\nmaître de l'identité civile", "b"),
        "con": N(430, 110, 360, 90, "CONNECTEUR VERSIONNÉ (2 versions compatibles)\nrésolution d'identité · événements ENTRANTS\nconnecteur DEMO fourni", "b"),
        "link": N(880, 110, 320, 80, "BiometricSubjectLink\npseudonyme = HMAC (clé non exportable du HSM)", "b"),
        "subj": N(880, 270, 320, 70, "BiometricSubject (identifiant stable)", "b"),
        "ev": N(430, 270, 360, 80, "BiometricIdentityEvent : fusion · scission · décès", "b"),
        "split": N(40, 270, 300, 110, "SCISSION : sujet SPLIT_PENDING ; chaque échantillon attribué par DEUX relecteurs ; 30 jours puis quarantaine", "b"),
        "deg": N(430, 450, 360, 90, "MODE DÉGRADÉ : lien en attente, file d'événements idempotente, délai 5 s, coupe-circuit ; recherches jamais bloquées", "b"),
        "out": N(880, 450, 320, 90, "SORTANT DÉSACTIVÉ ; attest() SUPPRIMÉ ; aucun gabarit échangé sans décision écrite", "r"),
        "loc": N(40, 450, 300, 70, "Person locale ; mergePersons émet un événement (modification minime)", "g"),
    }
    e = [("dun", "con", "identité · fusions", "arrow"), ("con", "link", "résolution", "arrow"), ("link", "subj", "", "arrow"), ("con", "ev", "événements", "arrow"), ("ev", "subj", "repointe les liens", "arrow"),
         ("ev", "split", "scission", "arrow"), ("loc", "ev", "fusion locale", "arrow"), ("con", "deg", "", "arrow"), ("subj", "out", "aucune divulgation", "arrow")]
    graph(IMG / "federation_v12.png", "Fédération avec le Dossier unique national v1.2 (A-17, A-18)", 1260, 600, n, e)

    # 10. modèle de données
    n = {
        "person": N(40, 90, 200, 60, "Person (locale)", "g"),
        "link": N(290, 90, 270, 60, "BiometricSubjectLink (identifiant national · pseudonyme)"),
        "dun": N(620, 90, 200, 60, "Dossier unique (futur)"),
        "subject": N(290, 220, 270, 60, "BiometricSubject (stable)"),
        "idev": N(620, 220, 240, 60, "BiometricIdentityEvent"),
        "staff": N(940, 220, 280, 70, "StaffIdentity (personne physique) ← Officer ← User"),
        "sample": N(40, 360, 270, 80, "BiometricSample (bv2, CLASSE DE DONNÉES, qualité, vivacité)"),
        "tmpl": N(360, 360, 270, 80, "BiometricTemplate (NORMALISÉ + PROPRIÉTAIRE, bv2)"),
        "enr": N(680, 360, 250, 80, "BiometricEnrollment (un par fournisseur et galerie)"),
        "prov": N(980, 360, 280, 80, "BiometricProvider (statut → classes admises ; isDemo fait foi)"),
        "basis": N(40, 520, 270, 80, "BiometricSampleBasis (bases légales multiples ; échéance = max)"),
        "cap": N(360, 520, 230, 60, "BiometricCapture (signée, ≤ 15 min)"),
        "key": N(640, 520, 260, 60, "BiometricKey (générations ; métadonnées)"),
        "erase": N(950, 520, 310, 70, "BiometricErasureRegister (miroir EXTERNE à écriture seule)"),
        "search": N(40, 700, 250, 80, "BiometricSearch (existant ; insertion seule pour le réel ; isDemo immuable)", "g"),
        "match": N(340, 700, 210, 80, "BiometricMatch (existant ; subjectId, scoreRaw)", "g"),
        "review": N(600, 700, 260, 80, "BiometricReview (décision unique, insertion seule, identités distinctes)"),
        "cev": N(910, 700, 240, 80, "BiometricControlEvent (états du contrôle réel)"),
        "ledger": N(40, 860, 330, 80, "BiometricLedger (chaîne) + Checkpoint signé + ancrage externe"),
        "job": N(420, 860, 230, 60, "BiometricJob (idempotence)"),
        "hit": N(700, 860, 260, 70, "BiometricWatchHit (plaques canoniques)"),
        "legacy": N(760, 960, 500, 60, "DEMO inchangé : FingerprintRecord · FaceRecord · VoiceRecord (DEMO_SHA256, CHECK)", "o"),
    }
    e = [("person", "link", "", "arrow"), ("dun", "link", "", "arrow"), ("link", "subject", "", "arrow"), ("subject", "idev", "", "both"), ("subject", "sample", "", "arrow"), ("sample", "tmpl", "", "arrow"), ("tmpl", "enr", "", "arrow"), ("enr", "prov", "", "arrow"),
         ("basis", "sample", "", "arrow"), ("cap", "sample", "", "arrow"), ("key", "tmpl", "DEK enveloppée", "arrow"), ("search", "match", "", "arrow"), ("search", "review", "", "arrow"), ("review", "cev", "", "arrow"), ("search", "ledger", "", "arrow"), ("search", "job", "", "arrow"), ("hit", "review", "", "arrow")]
    graph(IMG / "modele_donnees_v12.png", "Modèle de données v1.2", 1320, 1060, n, e)

diagrams()

RESTORE = [
    dict(a="Direction générale", t="Ouverture d'un incident ou d'une demande consignée HORS de la base.", s="Demande tracée"),
    dict(a="Direction générale", k="decision", t="Autorisation de deux profils (commandement national + responsable de la protection des données)."),
    dict(a="Administration", t="Quorum de gardiens (2 sur 3) : seul moyen de déchiffrer la sauvegarde (clé enveloppée par le HSM).", s="Sauvegarde déchiffrable"),
    dict(a="Système", k="system", t="Restauration en QUARANTAINE : environnement isolé, sans accès aux moteurs ni aux utilisateurs."),
    dict(a="Système", k="system", t="Contrôle de la chaîne du registre (hash, numéros de séquence, signatures)."),
    dict(a="Système", k="system", t="Comparaison de la tête restaurée aux points de contrôle et aux ANCRAGES EXTERNES : tête inférieure = RETOUR EN ARRIÈRE détecté → incident, autorisation de la Direction.", s="Retour en arrière ? oui / non"),
    dict(a="Système", k="system", t="Rejeu du REGISTRE D'EFFACEMENT EXTERNE : toute donnée réapparue est effacée avant ouverture."),
    dict(a="Système", k="system", t="Rejeu des statuts de fournisseurs, d'appareils et des révocations ; contrôle d'absence de donnée réelle hors production."),
    dict(a="Évaluateur indépendant", t="Signature du responsable de la protection des données et de l'auditeur."),
    dict(a="Administration", k="end", t="Remise en service ; journal externe de la restauration ; exercice trimestriel pour s'entraîner.", s="Service rétabli"),
]
flow.render("Restauration biométrique à quorum (A-04, A-05)", RESTORE, IMG / "restauration_v12.png")

PORT = [
    dict(a="Direction générale", t="Décision du comité ; clause de sortie du fournisseur sortant activée.", s="Décision signée"),
    dict(a="Administration", t="Nouveau fournisseur enregistré au statut SANDBOX : conformité sur DONNÉES SYNTHÉTIQUES uniquement.", s="SANDBOX"),
    dict(a="Système", k="system", t="ESSAI BI-FOURNISSEUR : ré-inscription d'un jeu synthétique depuis les images ; dégradation du FNMR ≤ [20 %] au même FMR."),
    dict(a="Évaluateur indépendant", t="Évaluation indépendante sur le jeu de la phase 3b (classe EVALUATION_CONSENTED).", s="EVALUATED"),
    dict(a="Direction générale", k="decision", t="Approbation d'activation en MODE OMBRE : deux identités, deux profils.", s="SHADOW"),
    dict(a="Système", k="system", t="Ré-inscription par lot des échantillons de référence (service biométrique, quotas, supervision)."),
    dict(a="Système", k="system", t="DOUBLE FONCTIONNEMENT sur sondes réelles, résultats non actionnables ; comparaison des candidats.", s="Rapport de concordance"),
    dict(a="Direction générale", k="decision", t="Approbation de bascule par modalité ; retour arrière R3 possible jusque-là.", s="ACTIVE"),
    dict(a="Système", k="system", t="Retrait de l'ancien : suppression des inscriptions avec PREUVE du fournisseur.", s="RETIRED"),
    dict(a="Administration", k="end", t="Destruction des gabarits propriétaires de l'ancien (suppression des clés) ; conservation des échantillons et du gabarit normalisé.", s="Changement terminé"),
]
flow.render("Changement de fournisseur AFIS : ordre corrigé (A-08, A-09)", PORT, IMG / "portabilite_v12.png")

PH = [
    dict(a="Phase 0 — Préalables", t="Avis juridique, DPO indépendant, analyse d'impact, protocole du jeu d'évaluation, budget, comité, rapports des 3 validateurs externes. Aucune donnée.", s="Sortie : décisions clés prises, aucune réserve critique ouverte"),
    dict(a="Phase 1a — Durcissement sans HSM", t="Rôles PostgreSQL, tripwire, registre chaîné (signature de développement), sauvegardes séparées, identité d'agent, épinglage.", s="Sortie : 100 % attaques refusées, 0 régression, 100 % falsifications détectées ≤ 15 min"),
    dict(a="Phase 1b — HSM, service biométrique, cérémonie", t="Deux HSM, service séparé, quotas, quorum 2/3, signatures, sauvegardes à quorum.", s="Sortie : cérémonie, coupe-circuit, bascule HSM ≤ 4 h, 0 vulnérabilité élevée"),
    dict(a="Phase 2 — Passerelle et contrats", t="Extensions de types.ts, classes de données et statuts (service + base), connecteur DEMO. Données synthétiques.", s="Sortie : conformité 100 %, 100 % associations interdites rejetées"),
    dict(a="Phase 3a — Laboratoire", t="Moteur en préproduction ; SYNTHÉTIQUE / SOUS LICENCE seulement ; essai bi-fournisseur.", s="Sortie : p95 1:1 ≤ 2 s, 1:N ≤ 10 s, dégradation FNMR ≤ 20 %"),
    dict(a="Phase 3b — Collecte encadrée (nouvelle)", t="Jeu d'évaluation : base légale, consentement, comité d'éthique, coffre dédié, destruction programmée.", s="Sortie : taille exigée, 100 % consentements, 0 fuite"),
    dict(a="Phase 4 — Évaluation indépendante (4a / 4b)", t="4a : essais du fournisseur (non décisifs). 4b : évaluation locale par l'organisme indépendant, bornes à 95 %.", s="Sortie : seuils FNMR / FPIR / groupes / vivacité atteints, sinon ARRÊT"),
    dict(a="Phase 5 — Pilote en mode ombre", t="Un commissariat ; résultats NON actionnables imposés par le système ; collège d'experts, sondes pièges.", s="Sortie : ≥ 3 000 non-appariées, infirmation ≤ 1 %, 0 résultat actionné"),
    dict(a="Phase 6 — Pilote opérationnel", t="Revue en aveugle systématique ; règle de corroboration ; contestation immédiate.", s="Sortie : 100 % revues indépendantes, 100 % corroborées, infirmées ≤ 0,1 %"),
    dict(a="Phases 7 et 8 — Extension, généralisation", t="Province par province (enquête de connectivité, ≥ 2 relecteurs) puis exploitation : réévaluation annuelle, exercices de restauration, de compromission et de changement de fournisseur.", k="end", s="Sortie : indicateurs tenus, audit externe, exercices réussis"),
]
flow.render("Neuf phases v1.2 — portes mesurables (phases 1, 3 et 4 en sous-étapes)", PH, IMG / "phases_v12.png")

ID = [
    dict(a="Enquêteur", t="Demande : affaire OUVERTE, cible PARTIE à l'affaire (sinon autorisation exceptionnelle), motif, base légale. Données de classe OPERATIONAL ; fournisseur SHADOW ou ACTIVE seulement."),
    dict(a="Agent", t="Capture signée par un appareil inscrit ; qualité et vivacité.", s="Capture acceptée"),
    dict(a="Système", k="system", t="Le service biométrique choisit le chemin (DEMO ou réel) ; extraction ; 1:1 ou 1:N dans la galerie du MOTEUR ; quotas de déballage appliqués."),
    dict(a="Système", k="system", t="Résultat : candidats, indice de rang, score brut, seuil. Jamais de décision automatique ; indisponible ≠ aucune correspondance.", s="NO_CANDIDATE / REVIEW_REQUIRED / UNAVAILABLE"),
    dict(a="Relecteur indépendant", k="decision", t="Revue EN AVEUGLE (sans score ni rang) par une IDENTITÉ distincte de l'opérateur et du demandeur ; sondes pièges ; réservoir unité → province → national.", s="Décision unique, insertion seule"),
    dict(a="Chef de service / Commissaire", t="RÈGLE DE CORROBORATION : aucune mesure coercitive sur la seule base du résultat ; au moins un élément indépendant non biométrique ; contestation immédiate possible."),
    dict(a="Système", k="system", t="Historique chaîné : registre, point de contrôle signé par le HSM, ancrage externe. La sonde n'est pas conservée."),
    dict(a="Auditeur / DPO", k="end", t="Vérification quotidienne indépendante ; indicateurs de qualité de la revue ; alertes d'anomalie."),
]
flow.render("Workflow d'identification biométrique v1.2", ID, IMG / "workflow_identification_v12.png")

# ------------------------------------------------------------------ tables générées
def short(txt, n=230):
    t = re.sub(r"\s+", " ", txt).replace("`", "").replace("**", "")
    cut = t.find(". ")
    if 0 < cut < n:
        t = t[: cut + 1]
    elif len(t) > n:
        t = t[:n].rsplit(" ", 1)[0] + " […]"
    return t.replace("|", "/")

def fiche(a):
    id_, titre, grav, stat, step, corr, comp, res, val = a
    return (f"#### {id_} — {titre}\n\n| Élément | Contenu |\n|---|---|\n"
            f"| Anomalie initiale | {titre} — gravité **{grav}**, statut de la revue **{stat}** |\n"
            f"| **Correction précise** | {corr.replace('|', '/')} |\n| Composants concernés | {comp.replace('|', '/')} |\n"
            f"| Risques résiduels | {res.replace('|', '/')} |\n| Validations nécessaires | {val.replace('|', '/')} |\n"
            f"| Chapitre | {CH[step]} |\n\n")

def step_block(step):
    return "".join(fiche(a) for a in ANOMALIES if a[4] == step)

def decisions_compact():
    rows = ["| N° | Décision | Recommandation | Décideur | Avant | Nature |", "|---|---|---|---|---|---|"]
    for d in DECISIONS:
        rows.append(f"| **{d[0]}** | {d[1]} | {d[3].replace('|', '/')} | {d[5]} | {d[6]} | {d[9]} |")
    return "\n".join(rows) + "\n"

def risks_table():
    rows = ["| N° | Risque | P | I | Brut | Classe brute | Mesures | P×I résiduel | Classe résiduelle | Propriétaire |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in RISKS:
        blk = r[0] == "R-09"
        b = r[3] * r[4]; res = r[6] * r[7]
        cb = "Bloquant" if blk else risk_class(b); cr = "Bloquant" if blk else risk_class(res)
        rows.append(f"| **{r[0]}** | {r[1]} | {r[3]} | {r[4]} | {b} | {cb} | {r[5].replace('|', '/')} | {res} | {cr} | {r[8]} |")
    return "\n".join(rows) + "\n"

def trace_table(full=False):
    h = "| N° | Gravité | Statut de la revue | Étape | Chapitre | Correction (résumé) | Composants | Risques résiduels | Validations nécessaires |"
    rows = [h, "|---|---|---|---|---|---|---|---|---|"]
    for a in ANOMALIES:
        rows.append(f"| **{a[0]}** | {a[2]} | {a[3]} | {a[4]} | {CH[a[4]]} | {short(a[5], 340)} | {short(a[6], 220)} | {short(a[7], 170)} | {short(a[8], 170)} |")
    return "\n".join(rows) + "\n"

tpl = (DOC / "SPEC_EVOLUTION_BIOMETRIQUE_V1.2.tpl.md").read_text(encoding="utf-8")
for i in range(1, 11):
    tpl = tpl.replace("{{STEP%d}}" % i, step_block(i))
tpl = tpl.replace("{{DECISIONS}}", decisions_compact()).replace("{{RISKS}}", risks_table()).replace("{{TRACE}}", trace_table())
tpl = tpl.replace("<!--pagebreak-->", "")
md = DOC / "SPEC_EVOLUTION_BIOMETRIQUE_V1.2.md"
md.write_text(tpl, encoding="utf-8")

# registres séparés
head = lambda t, s: f"# {t}\n\n**Police nationale du Tchad — Éditeur : TECHNOTCHAD — 11 novembre 2026 — {s}**\n\n"
dec = head("SIGPN-T — Registre des 23 décisions de la Direction (biométrie, version 1.2)", "Toutes les décisions sont EN ATTENTE ; les recommandations sont celles de l'éditeur") + \
    "D-01 à D-16 : reprises de la version 1.1, ajustées par la revue ; **D-17 à D-23 : nouvelles**. Aucune implémentation n'est autorisée tant que les décisions « Phase 0 » ne sont pas prises et que la version 1.2 n'a pas été validée par les trois validateurs externes.\n\n" + \
    "| N° | Décision | Question et options | Recommandation de l'éditeur | Si la décision tarde ou est négative | Décideur | À prendre avant | Anomalies liées | Documents requis | Nature | Statut |\n|---|---|---|---|---|---|---|---|---|---|---|\n" + \
    "\n".join(f"| **{d[0]}** | {d[1]} | {d[2]} | {d[3]} | {d[4]} | {d[5]} | {d[6]} | {d[7]} | {d[8]} | {d[9]} | **EN ATTENTE** |" for d in DECISIONS) + "\n"
(DOC / "REGISTRE_DECISIONS_V1.2.md").write_text(dec, encoding="utf-8")
rk = head("SIGPN-T — Registre des 25 risques (biométrie, version 1.2)", "Probabilité × impact ; classes Bloquant / Critique / Élevé / Moyen / Faible") + \
    "**Échelle.** P : 1 rare … 5 quasi certaine ; I : 1 faible … 5 critique ; niveau = P × I : Critique ≥ 15 · Élevé 10–14 · Moyen 5–9 · Faible ≤ 4 ; **Bloquant** : condition qui empêche toute phase. **R-09 (cadre juridique) : Bloquant. R-11 (faux positif → interpellation injustifiée) : Critique avant mesures, jamais sous Élevé après mesures.**\n\n" + risks_table()
(DOC / "REGISTRE_RISQUES_V1.2.md").write_text(rk, encoding="utf-8")
tr = head("SIGPN-T — Tableau de traçabilité des 30 anomalies (biométrie, version 1.2)", "Anomalie → étape → correction → composants → risque résiduel → validation") + \
    "Ordre des étapes : celui du rapport de revue (1 à 10). Statut de la revue = statut attribué à la version 1.1. **Statut de la version 1.2 : corrigé en conception, à valider par les trois validateurs externes.**\n\n" + trace_table()
(DOC / "TABLEAU_TRACABILITE_V1.2.md").write_text(tr, encoding="utf-8")

if "--convert" in sys.argv:
    sys.path.insert(0, str(mdout.MD2PDF.parent))
    import md2pdf
    for name, land in (("SPEC_EVOLUTION_BIOMETRIQUE_V1.2", False), ("REGISTRE_DECISIONS_V1.2", True), ("REGISTRE_RISQUES_V1.2", True), ("TABLEAU_TRACABILITE_V1.2", True)):
        m = DOC / f"{name}.md"
        md2pdf.convert(m, m.with_suffix(".pdf"), land, base=DOC)
        mdout.to_docx(m, m.with_suffix(".docx"), landscape=land)
    print("ok")
