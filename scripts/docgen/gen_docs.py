# -*- coding: utf-8 -*-
import shutil
from lib import *
import flow, c_modules, c_workflows
from gen_profiles import GEN_LOGIN, GEN_LOGOUT

WF = {w["id"]: w for w in c_workflows.WF}
DISPO = {"D": "Disponible", "P": "Partiellement disponible", "N": "Non construit"}

def holders(perm):
    return [c for c in ROLE_ORDER if perm in rperms(c)]

def prep_assets():
    cap = ROOT / "07_ANNEXES" / "captures"; cap.mkdir(parents=True, exist_ok=True)
    for f in (PMS / "docs/demo/screens").glob("*.png"):
        shutil.copy2(f, cap / f.name)
    (ROOT / "04_WORKFLOWS" / "img").mkdir(parents=True, exist_ok=True)
    (ROOT / "04_WORKFLOWS" / "mermaid").mkdir(parents=True, exist_ok=True)
    for w in c_workflows.WF:
        steps = [dict(a=s["a"], t=s["t"], k=s.get("k", "step"), s=s.get("s")) for s in w["steps"]]
        flow.render(f"{w['letter']}. {w['title']}", steps, ROOT / "04_WORKFLOWS" / "img" / f"{w['id']}.png")
        (ROOT / "04_WORKFLOWS" / "mermaid" / f"{w['id']}.mmd").write_text(flow.mermaid(w["title"], steps).replace("```mermaid\n", "").replace("\n```", "") + "\n", encoding="utf-8")

def wf_body(w, depth, heading=2):
    h = "#" * heading
    pre = "/".join([".."] * depth)
    s = f"{h} Circuit {w['letter']} — {w['title']}\n\n{w['intro']}\n\n"
    s += f"**Modules concernés :** {', '.join(w['modules'])}\n\n"
    s += f"![Diagramme du circuit {w['letter']}]({pre}/04_WORKFLOWS/img/{w['id']}.png)\n\n"
    s += f"{h}# Étapes détaillées\n\n"
    s += table(["N°", "Qui", "Action", "Précisions du système", "Statut après l'étape"], [(i, st["a"], st["t"], st.get("detail", ""), st.get("s", "")) for i, st in enumerate(w["steps"], 1)]) + "\n"
    s += f"{h}# Règles appliquées par le système\n\n" + bullets(w["rules"]) + "\n"
    s += f"{h}# Statuts\n\n" + table(["Code", "Libellé affiché", "Signification"], w["statuts"]) + "\n"
    if w.get("statuts2"):
        s += table(["Code", "Libellé affiché", "Signification"], w["statuts2"]) + "\n"
    s += f"{h}# Notifications envoyées\n\n" + table(["Événement", "Destinataires", "Message"], w["notifs"]) + "\n"
    s += f"{h}# Écrans\n\n" + (screens(depth, w["screens"]) or "Captures d'écran non disponibles dans le dossier d'images actuel pour ce circuit (voir l'annexe « Limites »).\n\n")
    s += f"{h}# À confirmer auprès de la hiérarchie\n\n" + bullets(w["confirm"]) + "\n"
    s += f"{h}# Ce que le système ne fait pas / améliorations recommandées\n\n" + bullets(w["gaps"] or ["Rien de particulier relevé."]) + "\n"
    return s

def mermaid_block(w):
    return "```mermaid\n" + (ROOT / "04_WORKFLOWS" / "mermaid" / f"{w['id']}.mmd").read_text(encoding="utf-8").strip() + "\n```\n"

def module_doc(m):
    wf = WF.get(m.get("wf")) if m.get("wf") else None
    s = front(f"Module {m['n']} — {m['title']}", f"Manuel de gestion — {m['title']}")
    s += f"**Disponibilité dans le système : {DISPO[m['dispo']]}.**  Écran : `{m['url']}`\n\n"
    if m["dispo"] == "N":
        s += "> Ce module n'est **pas construit** dans le SIGPN-T actuel. Ce document le dit clairement et décrit ce qui existe de plus proche, sans rien inventer.\n\n"
    s += f"## Objectif\n\n{m['objectif']}\n\n"
    perms = [c for c, _ in CAT["permissions"] if c.split(":")[0] in m["perms"]]
    s += "## Utilisateurs concernés\n\n"
    rolerows = []
    for c in ROLE_ORDER:
        mine = [x for x in perms if x in rperms(c)]
        if mine:
            lvl = "Consultation seule" if all(x.endswith(":view") or x.endswith(":view_sensitive") for x in mine) else "Consultation et opérations"
            rolerows.append((ROLE[c][0], lvl, len(mine)))
    s += (table(["Profil", "Niveau d'accès", "Droits du module"], rolerows) if rolerows else "Aucun profil n'a de droit propre à ce module.\n") + "\n"
    s += "## Fonctionnalités\n\n" + bullets(m["fonctions"]) + "\n"
    if m["forms"]:
        s += "## Formulaires\n\n" + table(["Formulaire", "Champs"], m["forms"]) + "\n"
    s += "## Étapes d'utilisation\n\n" + numbered(m["etapes"]) + "\n"
    s += f"## Résultats\n\n{m['resultats']}\n\n"
    if perms:
        s += "## Droits du module\n\n" + table(["Droit (code)", "Opération", "Sensible", "Profils qui le détiennent"], [(f"`{c}`", plabel(c), "Oui" if c in SENS else "", ", ".join(ROLE[h][0] for h in holders(c)) if len(holders(c)) <= 5 else f"{len(holders(c))} profils") for c in perms]) + "\n"
    if wf:
        s += wf_body(wf, 1, 2)
    scr = screens(1, m["screens"]) if m["screens"] else ""
    if scr and not wf:
        s += "## Écrans\n\n" + scr
    s += "## À confirmer auprès de la hiérarchie\n\n" + bullets(m["confirm"] or ["—"]) + "\n"
    s += "## Améliorations recommandées\n\n" + bullets(m["gaps"] or ["Aucune relevée."]) + "\n"
    s += GEN_LOGOUT.replace("### Se déconnecter en sécurité", "## Se déconnecter en sécurité")
    return s

def build_modules(o):
    done_arrest = False
    for m in c_modules.M:
        if m["n"] in (10, 11):
            if done_arrest:
                continue
            done_arrest = True
            a, b = [x for x in c_modules.M if x["n"] in (10, 11)]
            m = dict(a); m["n"] = "10-11"; m["title"] = "Gestion des arrestations et des gardes à vue"
            m["fonctions"] = a["fonctions"] + b["fonctions"]; m["forms"] = a["forms"] + b["forms"]; m["etapes"] = a["etapes"] + b["etapes"]
            m["screens"] = a["screens"] + b["screens"]; m["perms"] = ["arrests", "detention"]; m["url"] = "/arrests et /detention"
            m["objectif"] = a["objectif"] + " " + b["objectif"]; m["resultats"] = a["resultats"] + " " + b["resultats"]
            name = "10_Arrestations_et_gardes_a_vue"
        else:
            name = f"{m['n']:02d}_{m['key']}"
        o.write(f"03_MANUELS_PAR_MODULE/{name}.md", module_doc(m))
    # manuel des validations
    g = WF["G_validations"]
    s = front("Manuel des validations", "Qui initie, contrôle, valide, reçoit, est informé — et peut retourner le dossier")
    s += "Ce manuel recense les validations **dont la preuve existe dans le système**. Aucun pouvoir de validation n'est attribué au-delà des droits portés par les rôles ; ce qui relève d'une décision organisationnelle est marqué « À confirmer ».\n\n"
    vrows = [
        ("Mandat", "Enquêteur (demande)", "—", "Commandant habilité (approuve/rejette) ; jamais le demandeur", "Demandeur", "Titulaires du droit d'exécuter", "Rejet motivé : il faut recréer le mandat"),
        ("Avis de recherche", "Enquêteur (émet)", "Vérificateur ≠ émetteur (peut être l'approbateur)", "Approbateur ≠ émetteur (droit sensible)", "Unités du périmètre (alerte)", "Superviseurs en cas d'escalade", "Brouillon modifiable avant approbation ; annulation motivée"),
        ("Publication publique d'un avis", "Émetteur prépare le texte", "Vérifié obligatoire", "Personne ≠ émetteur, validation expresse", "Public", "—", "Retrait automatique si l'avis n'est plus actif"),
        ("Affaire (clôture, transmission)", "Enquêteur (soumet)", "—", "Titulaire du droit de clôture", "Responsable de l'affaire", "Équipe", "Retour à « En enquête »"),
        ("Plainte", "Agent d'accueil (enregistre)", "—", "Commissaire (examine, affecte)", "Enquêteur affecté", "Plaignant (portail, via code)", "Clôture/rejet définitifs"),
        ("Prolongation de garde à vue", "Agent de garde (signale)", "—", "Titulaire du droit de prolonger (sensible)", "—", "—", "Nouvelle échéance obligatoire"),
        ("Compte, rôle, habilitation", "Administrateur", "—", "1 ou 2 approbateurs de niveaux différents", "Demandeur", "Utilisateur concerné (sécurité)", "Rejet : nouvelle demande"),
        ("Mutation", "Proposant", "Examen RH", "Autorité couvrant les deux structures", "Agent muté, proposant, unités", "Responsables des affaires ouvertes", "Rejet avec note"),
        ("Congé", "Demandeur", "—", "Titulaire du droit d'approuver", "Demandeur", "—", "Rejet avec note"),
        ("Paie", "Gestionnaire de paie", "—", "Contrôleur de paie ≠ demandeur", "Services financiers (export)", "—", "Rejet"),
        ("Versement de recettes", "Agent (déclare)", "Chef d'unité (clôture)", "Examinateur puis valideur", "Agent", "Responsable financier", "Justification demandée ou rejet"),
    ]
    s += table(["Opération", "Qui initie", "Qui contrôle", "Qui valide", "Qui reçoit", "Qui est informé", "Retour pour correction"], vrows) + "\n"
    s += "## Règles communes\n\n" + bullets(g["rules"]) + "\n"
    s += wf_body(g, 1, 2).replace("## Circuit G", "## Circuit détaillé G", 1)
    o.write("03_MANUELS_PAR_MODULE/21_Manuel_des_validations.md", s)

def build_workflows(o):
    ov = front("Diagrammes des workflows", "Tous les circuits du SIGEC-PN / SIGPN-T")
    ov += "Chaque diagramme est fourni sous trois formes : image (ci-dessous), fichier Mermaid (`04_WORKFLOWS/mermaid/*.mmd`) et bloc Mermaid dans le document `00_Diagrammes_Mermaid`. Les couleurs identifient les acteurs : Citoyen, Agent, Enquêteur, Chef de service / Commissaire, Délégué provincial, Direction générale, Système, Administration, RH, Finance.\n\n"
    for w in c_workflows.WF:
        ov += f"## {w['letter']}. {w['title']}\n\n![{w['title']}](./img/{w['id']}.png)\n\n"
    o.write("04_WORKFLOWS/00_Diagrammes_des_workflows.md", ov)
    mm = front("Diagrammes Mermaid", "Sources Mermaid de tous les circuits (à coller dans mermaid.live ou tout outil compatible)")
    for w in c_workflows.WF:
        mm += f"## {w['letter']}. {w['title']}\n\n" + mermaid_block(w) + "\n"
    o.write("04_WORKFLOWS/00_Diagrammes_Mermaid.md", mm)
    for w in c_workflows.WF:
        s = front(f"Circuit {w['letter']} — {w['title']}", "Circuit opérationnel complet")
        s += wf_body(w, 1, 2) + "\n## Source Mermaid\n\n" + mermaid_block(w)
        o.write(f"04_WORKFLOWS/{w['letter'].replace(' ', '')}_{w['id'].split('_', 1)[1]}.md", s)
