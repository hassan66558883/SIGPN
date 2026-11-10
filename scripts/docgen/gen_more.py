# -*- coding: utf-8 -*-
import csv
from lib import *
import c_workflows, c_modules, flow
from gen_profiles import GEN_LOGIN, GEN_LOGOUT, PROFILES
from gen_docs import DISPO, holders

# ------------------------------------------------------------------ MATRICES
def build_matrices(o):
    short = {c: c for c in ROLE_ORDER}
    # 1. matrice rôles x droits (une table par module)
    s = front("Matrice complète des comptes et permissions", "29 rôles × 157 droits — lecture seule du catalogue du système")
    s += "Lecture : ● = le rôle détient le droit ; ◆ = droit sensible détenu (n'agit qu'avec l'habilitation requise). Les colonnes sont les 29 rôles (codes). Un droit absent est **refusé**.\n\n"
    s += "## Légende des rôles\n\n" + table(["N°", "Code", "Fonction", "Périmètre", "2nd facteur", "Droits"], [(i, f"`{c}`", ROLE[c][0], SCOPE[ROLES[c]['scopeLevel']], "Oui" if ROLES[c]["requiresMfa"] else "Non", len(rperms(c))) for i, c in enumerate(ROLE_ORDER, 1)]) + "\n"
    heads = ["Droit"] + [str(i) for i in range(1, len(ROLE_ORDER) + 1)]
    mods = {}
    for c, _ in CAT["permissions"]:
        mods.setdefault(c.split(":")[0], []).append(c)
    for m, codes in mods.items():
        rows = []
        for c in codes:
            mark = "◆" if c in SENS else "●"
            rows.append([plabel(c)] + [mark if c in rperms(r) else "" for r in ROLE_ORDER])
        s += f"## {mlabel(m)}\n\n" + table(heads, rows) + "\n"
    o.write("05_MATRICE_ROLES_PERMISSIONS/01_Matrice_comptes_et_permissions.md", s, landscape=True)
    with open(ROOT / "05_MATRICE_ROLES_PERMISSIONS" / "Matrice_roles_permissions.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";"); w.writerow(["Droit", "Code", "Module", "Sensible"] + ROLE_ORDER)
        for c, _ in CAT["permissions"]:
            w.writerow([plabel(c), c, mlabel(c.split(":")[0]), "oui" if c in SENS else ""] + ["x" if c in rperms(r) else "" for r in ROLE_ORDER])
    try:
        import openpyxl
        wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Matrice"
        ws.append(["Droit", "Code", "Module", "Sensible"] + ROLE_ORDER)
        for c, _ in CAT["permissions"]:
            ws.append([plabel(c), c, mlabel(c.split(":")[0]), "oui" if c in SENS else ""] + ["x" if c in rperms(r) else "" for r in ROLE_ORDER])
        ws.freeze_panes = "E2"
        wb.save(ROOT / "05_MATRICE_ROLES_PERMISSIONS" / "Matrice_roles_permissions.xlsx")
    except ImportError:
        pass

    # 2. RACI calculé à partir des droits
    PROCS = [
        ("Enregistrer une plainte", ["complaints:create"], ["complaints:review"], ["complaints:view"], []),
        ("Examiner, affecter, convertir une plainte", ["complaints:review", "complaints:assign", "complaints:convert"], ["complaints:assign"], ["complaints:view"], ["cases:assign"]),
        ("Instruire une affaire", ["cases:update", "cases:create"], ["cases:close"], ["cases:view"], ["cases:assign"]),
        ("Transmettre ou clôturer une affaire", ["cases:close"], ["cases:close"], ["cases:view"], []),
        ("Archiver une affaire", ["cases:archive"], ["cases:archive"], ["cases:view"], []),
        ("Demander un mandat", ["warrants:create"], ["warrants:approve"], ["warrants:view"], []),
        ("Approuver / exécuter un mandat", ["warrants:execute", "warrants:approve"], ["warrants:approve"], ["warrants:view"], []),
        ("Émettre un avis de recherche", ["wanted:create"], ["wanted:approve"], ["wanted:view"], ["alerts:view"]),
        ("Vérifier un avis de recherche", ["wanted:verify"], ["wanted:approve"], ["wanted:view"], []),
        ("Publier un avis sur le site public", ["wanted:publish"], ["wanted:publish"], ["wanted:view"], []),
        ("Recevoir et acquitter une alerte", ["alerts:ack"], ["alerts:supervise"], ["alerts:view"], ["alerts:view"]),
        ("Enregistrer une arrestation", ["arrests:create"], ["arrests:update"], ["arrests:view"], []),
        ("Ouvrir et surveiller une garde à vue", ["detention:manage"], ["detention:extend"], ["detention:view"], []),
        ("Prolonger une garde à vue", ["detention:extend"], ["detention:extend"], ["detention:view"], []),
        ("Signaler et clore un incident", ["incidents:create"], ["incidents:update"], ["incidents:view"], ["incidents:update"]),
        ("Planifier une patrouille", ["patrols:manage"], ["patrols:manage"], ["patrols:view"], []),
        ("Enregistrer une pièce à conviction", ["evidence:create"], ["evidence:release"], ["evidence:view"], []),
        ("Contrôle routier et PV", ["traffic:control_create"], ["traffic:fine_manage"], ["traffic:view"], ["traffic:fine_manage"]),
        ("Encaisser une amende", ["traffic:payment_record", "cash:collect"], ["cash:verify_closure"], ["cash:view"], []),
        ("Versement de recettes", ["cash:deposit_create"], ["cash:deposit_validate"], ["cash:view"], ["cash:deposit_review"]),
        ("Créer un compte utilisateur", ["users:create"], ["approvals:decide"], ["users:view"], ["users:reset_password"]),
        ("Modifier les droits d'un rôle", ["roles:manage"], ["approvals:decide"], ["roles:view"], []),
        ("Proposer et exécuter une mutation", ["hr:transfer_propose", "hr:transfer_review"], ["hr:transfer_validate"], ["hr:view"], []),
        ("Demande et décision de congé", ["hr:leave_request"], ["hr:leave_approve"], ["hr:view"], []),
        ("Paie", ["hr:pay_manage"], ["hr:pay_validate"], ["hr:pay_view"], []),
        ("Traiter un dépôt du site public", ["intake:manage"], ["intake:manage"], ["intake:view"], []),
        ("Consulter le journal d'audit", [], [], ["audit:view"], []),
    ]
    cols = ["SUPER_ADMIN", "SECURITY_ADMIN", "POLICE_ADMIN", "NATIONAL_COMMANDER", "REGIONAL_COMMANDER", "STATION_COMMANDER", "INVESTIGATOR", "DESK_OFFICER", "PATROL_OFFICER", "OFFICER", "CUSTODY_OFFICER", "EVIDENCE_CUSTODIAN", "TRAFFIC_OFFICER", "TRAFFIC_SUPERVISOR", "TRAFFIC_PAYMENT_MANAGER", "HR_DIRECTOR", "AUDITOR", "PROSECUTOR"]
    def cell(code, R_, A_, C_, I_):
        p = rperms(code)
        r = bool(p & set(R_)); a = bool(p & set(A_)); c = bool(p & set(C_)); i = bool(p & set(I_))
        if r and a: return "R/A"
        if r: return "R"
        if a: return "A"
        if i: return "I"
        if c: return "C"
        return ""
    s = front("Matrice RACI", "Responsable (R), Approbateur (A), Consulté (C), Informé (I) pour chaque procédure")
    s += "> **Méthode.** Cette matrice est **calculée automatiquement à partir des droits** réellement attribués aux rôles du système ; elle n'exprime pas l'organigramme officiel. R = peut accomplir l'acte ; A = peut le valider ou en décider (le demandeur lui-même est exclu par le système pour mandats, avis et approbations : règle des quatre yeux) ; C = peut consulter ; I = reçoit une notification. « R/A » = le même profil accomplit et décide (ex. commissaire pour une affectation). Une case vide = aucun rôle. **L'attribution officielle des responsabilités doit être confirmée par la hiérarchie.**\n\n"
    s += "Rôles (colonnes) : " + " ; ".join(f"**{i}** = {ROLE[c][0]}" for i, c in enumerate(cols, 1)) + "\n\n"
    for chunk in (cols[:9], cols[9:]):
        base = cols.index(chunk[0])
        heads = ["Procédure"] + [f"{base + j + 1}" for j in range(len(chunk))]
        rows = [[name] + [cell(c, R_, A_, C_, I_) for c in chunk] for name, R_, A_, C_, I_ in PROCS]
        s += table(heads, rows) + "\n"
    o.write("05_MATRICE_ROLES_PERMISSIONS/02_Matrice_RACI.md", s, landscape=True)

    # 3. cartographie organisationnelle
    s = front("Cartographie organisationnelle des responsabilités", "Niveaux, rôles, périmètres et lignes de transmission")
    s += "## Les niveaux du système\n\n"
    s += table(["Niveau", "Profil dans le système", "Périmètre de données", "Voit", "Transmet à"], [
        ("Direction générale (DGPN)", "Commandement national", "Tout le pays", "Toutes les données nationales", "Autorité de tutelle (hors système)"),
        ("Directions centrales et unités (14 selon le décret 0572/2023)", "Aucun rôle dédié : rôle national attribué par la Direction", "Selon le rôle attribué", "Selon le rôle", "Direction générale"),
        ("Délégations provinciales (23 provinces)", "Délégué provincial de police", "Sa province", "Tous les commissariats de la province", "Direction générale"),
        ("Départements (rôle dormant)", "Commandant de département", "Son département", "—", "Délégué provincial"),
        ("Commissariats", "Commissaire", "Son commissariat et ses postes rattachés", "Toutes les données du commissariat", "Délégué provincial"),
        ("Postes, brigades, unités", "Agents (accueil, patrouille, circulation…)", "Leur unité", "Leurs propres enregistrements et ceux de l'unité selon le droit", "Commissaire"),
        ("Services transversaux", "RH, paie, finances, audit, analyse, parquet", "National ou provincial selon le rôle", "Selon le droit", "Direction concernée"),
    ]) + "\n"
    s += "## Chaîne de responsabilité d'une plainte\n\nAgent d'accueil → Commissaire → Enquêteur → Commissaire (contrôle) → Parquet (hors système).\n\n"
    s += "## Chaîne de responsabilité d'un avis de recherche\n\nEnquêteur (émet) → Commissaire ou autre vérificateur (vérifie) → Commandement (approuve) → Unités (acquittent) → Superviseurs (escalade).\n\n"
    s += "## Les 14 directions centrales et unités du décret 0572/2023 chargées dans le système\n\nDSP, DLGDEAM, DPTSCI, DIE, DRHM, DITT, DLS, DSPSM, DBCN-IP, DENP, GMIP, GSR, USIP, UNILT (placées sous la Direction générale). **Leur organisation détaillée est fixée par arrêté ministériel (article 91) : elle n'est pas dans le système.**\n\n"
    s += "## Comptes par profil\n\n" + table(["Profil", "Code", "Périmètre", "Supérieur (d'après le système)"], [(ROLE[c][0], f"`{c}`", SCOPE[ROLES[c]["scopeLevel"]], R.HIER[c][0]) for c in ROLE_ORDER]) + "\n"
    flow.render("Hiérarchie de supervision", [dict(a="Direction générale", t="Commandement national : supervision de tout le territoire, approbations sensibles", s=None), dict(a="Délégué provincial", t="Délégation provinciale (23) : supervision de tous les commissariats de la province"), dict(a="Chef de service / Commissaire", t="Commissariat : examen des plaintes, affectation, contrôle des affaires"), dict(a="Enquêteur", t="Enquêteurs et agents : accueil, patrouille, circulation, garde à vue, scellés")], ROOT / "05_MATRICE_ROLES_PERMISSIONS" / "hierarchie.png")
    s += "![Hiérarchie de supervision](./hierarchie.png)\n\n"
    s += "## À confirmer\n\n" + bullets(["Organigramme réel des services à l'intérieur des commissariats (non modélisé).", "Rattachement des directions centrales aux rôles du système.", "Qui est « chef de service » entre l'agent et le commissaire."])
    o.write("05_MATRICE_ROLES_PERMISSIONS/03_Cartographie_organisationnelle.md", s)

# ------------------------------------------------------------------ GÉNÉRAL / AUDIT / SÉCURITÉ
def build_general(o):
    # audit et inventaire
    s = front("Audit documentaire et inventaire du système", "Modules, comptes, rôles, circuits, notifications, formulaires, recherche et rapports")
    s += "## 1. Méthode\n\nLecture seule du système existant : code source (services, schémas, droits, navigation), catalogue des 29 rôles et 157 droits, comptes de démonstration, captures d'écran réelles de l'application. **Aucun fichier de production, aucune base de données, aucun compte et aucune permission n'ont été modifiés.** Les circuits sont ceux que le code impose ; ce qui relève d'une décision organisationnelle est marqué « À confirmer ».\n\n"
    s += "## 2. Inventaire des modules du menu\n\n" + table(["Rubrique", "Module", "Écran", "Droit d'accès", "État"], nav_all()) + "\n"
    s += "## 3. Les 20 modules demandés par la mission\n\n" + table(["N°", "Module", "Disponibilité", "Écran réel"], [(m["n"], m["title"], DISPO[m["dispo"]], m["url"]) for m in c_modules.M]) + "\n"
    s += "## 4. Inventaire des rôles\n\n" + table(["Code", "Fonction", "Périmètre", "2nd facteur", "Droits", "Comptes de démonstration"], [(f"`{c}`", ROLE[c][0], SCOPE[ROLES[c]['scopeLevel']], "Oui" if ROLES[c]["requiresMfa"] else "Non", len(rperms(c)), ", ".join(accounts_of(c)) or "—") for c in ROLE_ORDER]) + "\n"
    s += "## 5. Correspondance avec les profils demandés\n\n" + table(["Profil demandé", "Existe dans le système ?", "Profil système"], [
        ("Directeur général", "Oui (commandement national)", "NATIONAL_COMMANDER"), ("Directeur général adjoint", "Non distinct", "Même profil que le DG"), ("Directeurs centraux", "Non", "Rôle national attribué par la Direction"),
        ("Délégués provinciaux", "Oui", "REGIONAL_COMMANDER (23 comptes)"), ("Commissaires", "Oui", "STATION_COMMANDER"), ("Commissaires adjoints", "Non", "—"), ("Chefs de service", "Non (hors circulation et recettes)", "TRAFFIC_SUPERVISOR, TRAFFIC_UNIT_HEAD"),
        ("Officiers de police judiciaire", "Oui, mais sans pouvoir judiciaire propre", "OFFICER"), ("Enquêteurs", "Oui", "INVESTIGATOR"), ("Agents de police", "Oui, par fonction", "DESK_OFFICER, PATROL_OFFICER, TRAFFIC_*, CUSTODY_OFFICER…"),
        ("Responsables des archives", "Non (module Documents/Archives non construit)", "—"), ("Responsables administratifs", "Partiel", "POLICE_ADMIN, HR_*"), ("Administrateurs techniques", "Oui", "SUPER_ADMIN, SECURITY_ADMIN, POLICE_ADMIN")]) + "\n"
    s += "## 6. Comptes de démonstration (36)\n\n" + table(["Identifiant", "Profil", "Rattachement"], [(f"`{a['username']}`", ROLE[a['roleCode']][0], a["hint"]) for a in ACCOUNTS]) + "\n"
    s += "## 7. Circuits recensés\n\n" + table(["Circuit", "Titre", "Étapes"], [(w["letter"], w["title"], len(w["steps"])) for w in c_workflows.WF]) + "\n"
    s += "## 8. Circuits de validation\n\nVoir le manuel des validations (dossier 03) : mandats, avis, publication, affaires, plaintes, garde à vue, comptes/rôles/habilitations, mutations, congés, paie, versements.\n\n"
    s += "## 9. Notifications\n\nVoir le catalogue des notifications (dossier 07). Aucune notification par SMS ou courriel n'existe ; seules les notifications internes et le bandeau d'alerte rouge.\n\n"
    s += "## 10. Tableaux de bord, recherche et rapports\n\n" + bullets(["Tableau de bord général (chiffres selon les droits, période réglable).", "Tableau de bord circulation et tableau de bord des recettes.", "Recherche : Personnes recherchées (rapide et avancée), Recherche circulation ; la recherche globale du menu est prévue mais non construite.", "Rapports : 12 rapports de recettes (JSON, CSV, PDF) ; la page Rapports générale est prévue mais non construite.", "Statistiques : la page Statistiques est prévue mais non construite."]) + "\n"
    s += "## 11. Formulaires principaux (champs relevés dans le code)\n\n" + table(["Formulaire", "Champs"], [("Plainte", "plaignant ou anonyme, catégorie (20), titre, description, date, lieu, commissariat, priorité"), ("Affaire", "titre, catégorie, description, date, lieu, commissariat, département, priorité, sensible, responsable"), ("Mandat", "type, personne, affaire, autorité, référence, motifs, adresse, expiration"), ("Avis de recherche", "personne, affaire, infraction, motif, danger, nature, diffusion, base légale, autorité, dernière localisation, expiration"), ("Arrestation", "personne, affaire, mandat, agent, lieu, fondement, chefs d'accusation, circonstances, droits lus, notes"), ("Garde à vue", "arrestation, cellule, notes médicales ; journal ; prolongation ; fin"), ("Incident", "type, gravité, titre, description, lieu, coordonnées, commissariat, patrouille"), ("Patrouille", "zone, équipe, mission, superviseur, véhicule, agents"), ("Pièce à conviction", "affaire, catégorie, description, quantité, scellé, provenance, état, lieu"), ("Personne", "identité, naissance, contacts, signalement, pièce d'identité")]) + "\n"
    s += "## 12. Ce que l'audit n'a pas pu vérifier\n\n" + bullets(["Le fonctionnement sur le réseau réel des unités, en production : seules la démonstration et les tests le prouvent.", "Les procédures judiciaires et hiérarchiques réelles : aucune supposition n'a été faite.", "Certains écrans ne figurent pas dans le dossier d'images existant (incidents, patrouilles, pièces à conviction, ressources humaines, recettes) : pas de capture d'écran inventée.", "Le second facteur est suspendu sur l'installation de démonstration (interrupteur temporaire à retirer avant la mise en service).", "Les droits des 29 rôles sont ceux **effectivement enregistrés** dans la base de démonstration, lue en lecture seule (le code des rôles, plus les droits ajoutés à la synchronisation : alertes, site public, contrôle biométrique). Un rôle temporaire de test (TMP_UI_TEST), résidu présent dans la base de développement, n'est pas un rôle du système et n'est pas documenté."]) + "\n"
    o.write("01_MANUEL_GENERAL/00_Audit_et_inventaire.md", s)

    # sécurité
    s = front("Sécurité, contrôle et traçabilité", "Authentification, permissions, confidentialité, historique, sessions, désactivation")
    s += "## 1. Connexion et authentification\n\n" + bullets(["Identifiant + mot de passe ; après 5 échecs le compte est verrouillé 15 minutes.", "Mots de passe : 12 caractères minimum, trois types sur quatre, ni courant, ni contenant l'identifiant ou le nom du courriel ; renouvellement tous les 90 jours (valeur par défaut) ; les 5 derniers ne peuvent pas être réutilisés.", "Second facteur (application d'authentification, code à 6 chiffres) exigé selon le rôle, ou si le compte détient un droit sensible ou une habilitation élevée. **Il est actuellement suspendu sur l'installation de démonstration par un interrupteur temporaire ; sa réactivation avant la mise en service est indispensable (À confirmer par la Direction).**", "Mot de passe oublié : demande transmise à l'administrateur de sécurité ; lien à usage unique valable 60 minutes."]) + "\n"
    s += "## 2. Permissions et habilitations\n\n" + bullets(["Chaque action est protégée par un droit précis (157 droits) attribué à un rôle (29 rôles).", "Le périmètre territorial borne ce que l'on voit : national, provincial, commissariat.", "20 droits sont **sensibles** (approuver un mandat ou un avis, prolonger une garde à vue, voir les affaires sensibles, paie, discipline, exports, sauvegardes…) : ils n'agissent que si le compte a l'habilitation Sensible ou Confidentiel, attribuée par l'administrateur de sécurité (jamais à soi-même).", "Les changements sensibles (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) passent par un circuit d'approbation à deux personnes différentes."]) + "\n"
    s += "## 3. Confidentialité et protection des dossiers judiciaires\n\n" + bullets(["Les affaires **sensibles** ne sont visibles que de leur équipe et des titulaires du droit dédié.", "Les lectures de dossiers sensibles et de mandats sont **journalisées**.", "Les données de paie et de discipline sont strictement confidentielles ; chaque lecture est journalisée.", "Les pièces et données personnelles du site public ne sont jamais exposées ; le code de suivi est conservé haché."]) + "\n"
    s += "## 4. Journalisation et traçabilité\n\n" + bullets(["Toute action importante est inscrite au journal d'audit : qui, quoi, quand, avant/après, adresse.", "Le journal est **infalsifiable** : chaîne de hachage ; un bouton de contrôle d'intégrité (Centre de sécurité) vérifie la chaîne. Limite : la suppression de la toute dernière ligne n'est détectable que si l'empreinte de tête est conservée en dehors de la base.", "Les validations sont tracées (qui a demandé, qui a vérifié, qui a approuvé)."]) + "\n"
    s += "## 5. Sessions\n\n" + bullets(["Expiration après 60 minutes d'inactivité et 10 heures au maximum.", "Comptes détenant un droit sensible : 15 minutes d'inactivité et une seule session active à la fois.", "L'administrateur de sécurité peut voir et révoquer les sessions ; une mutation met fin aux sessions de l'agent et abaisse son habilitation au niveau standard."]) + "\n"
    s += "## 6. Désactivation des comptes\n\nStatuts : En attente, Actif, Verrouillé, Suspendu, Désactivé. Un compte désactivé ne peut plus se connecter ; il n'est jamais supprimé (traçabilité).\n\n"
    s += "## 7. Clés d'accès (API)\n\nLes clés créées dans l'application ne portent jamais de droit sensible, ont une expiration obligatoire (1 à 90 jours) ; l'administrateur de sécurité peut toutes les lister et révoquer.\n\n"
    s += "## 8. Responsabilités techniques et opérationnelles\n\n" + table(["Responsabilité", "Qui", "Ne peut pas"], [("Plate-forme, sauvegardes, structure", "Administrateur technique", "Aucun droit sur les plaintes, affaires, mandats, arrestations, avis"), ("Comptes, sessions, audit", "Administrateur de sécurité", "Aucune autorité opérationnelle de police"), ("Décisions opérationnelles et judiciaires", "Commandement, enquêteurs, commissaires selon leurs droits", "Administrer la plate-forme"), ("Contrôle externe", "Auditeur, parquet (lecture)", "Modifier")]) + "\n"
    s += "> L'administrateur technique n'est **jamais** considéré comme un responsable opérationnel ou judiciaire.\n\n"
    s += "".join(f"![{c}](../07_ANNEXES/captures/{n})\n\n" for n, c in [("theme-security.png", "Centre de sécurité"), ("aud-1-chain-and-keys.png", "Contrôle de la chaîne d'audit"), ("theme-account.png", "Mon compte"), ("aud-11-tech-admin-refused.png", "L'administrateur technique n'accède pas aux données de police")])
    s += "## 9. Points à confirmer\n\n" + bullets(["Durées de session et délais de verrouillage à valider par la Direction (valeurs proposées).", "Politique de renouvellement de mot de passe (90 jours par défaut).", "Réactivation du second facteur en production."])
    o.write("01_MANUEL_GENERAL/02_Securite_et_controle.md", s)

    # manuel général
    s = front("Manuel général du SIGEC-PN / SIGPN-T", "Prise en main pour tous les utilisateurs de la Police nationale")
    s += "## 1. À quoi sert le système\n\nLe SIGPN-T est le système d'information de la Police nationale du Tchad. Il permet d'enregistrer et de suivre : les plaintes et les affaires, les personnes, les mandats et les avis de recherche, les arrestations et gardes à vue, les incidents et patrouilles, les pièces à conviction, la circulation routière (contrôles, procès-verbaux, amendes, recettes), les ressources humaines et l'administration des comptes. Il est en **français et en arabe** (lecture de droite à gauche) et s'utilise sur ordinateur et sur téléphone.\n\n"
    s += "## 2. Les principes à retenir\n\n" + bullets(["**Chacun voit ce que son rôle et son affectation permettent** : un commissariat ne voit que ses dossiers, un délégué provincial que sa province.", "**Rien n'est effacé** : tout est historisé ; les corrections se font par statut (annulé, rejeté, clos).", "**Deux personnes pour les actes graves** : celui qui demande ne valide pas (mandat, avis de recherche, comptes, paie).", "**Une alerte ou une correspondance n'est jamais une preuve** : l'humain vérifie avant d'agir.", "**Votre compte est personnel** : tout est enregistré à votre nom."]) + "\n"
    s += GEN_LOGIN
    s += "## 3. Découvrir l'écran\n\n" + bullets(["**Menu de gauche** : les modules autorisés (sur téléphone : bouton de navigation).", "**En-tête** : sélecteur de langue (français / arabe), notifications (cloche), **Mon compte** (votre nom, votre fonction et votre unité) et le bouton **Déconnexion**.", "**Tableau de bord** : les chiffres de votre périmètre.", "**Listes** : filtres, recherche, tri ; un clic ouvre la fiche.", "**Boutons** : les actions disponibles pour votre profil ; un bouton absent signifie un droit manquant."]) + "\n"
    s += "![Page de connexion](../07_ANNEXES/captures/s0-1-connexion-fr.png)\n\n![Tableau de bord](../07_ANNEXES/captures/theme-dashboard.png)\n\n![Sur téléphone](../07_ANNEXES/captures/theme-phone-dashboard.png)\n\n![En arabe](../07_ANNEXES/captures/s0-2-connexion-ar-rtl.png)\n\n"
    s += "## 4. Les notifications\n\nLa cloche signale : affectations, décisions à prendre, échéances, alertes, sécurité. Les alertes nationales (avis de recherche) s'affichent en **bandeau rouge** sur toutes les pages. Les notifications ne sont pas envoyées par SMS ni par courriel.\n\n"
    s += "## 5. Les statuts\n\nChaque dossier a un statut visible (par exemple pour une plainte : Brouillon, Enregistrée, En examen, Affectée, Convertie, Clôturée, Rejetée). Les statuts « définitifs » ne se modifient plus. Voir les circuits (dossier 04).\n\n"
    s += "## 6. Quel manuel lire ?\n\n" + table(["Je suis…", "Manuel"], [(p["title"].replace("Manuel ", "").replace("des ", "").replace("du ", ""), f"02_MANUELS_PAR_PROFIL/{p['file']}") for p in PROFILES]) + "\n"
    s += "## 7. Ce que le système ne fait pas (état actuel)\n\n" + bullets(["Main courante dédiée, procès-verbaux d'audition/déclaration, enquêtes en écran dédié, opérations, documents/archives, rapports et statistiques généraux, recherche globale : prévus mais **non construits**.", "Transfert de dossier entre commissariats avec acceptation ou refus motivé.", "Échange électronique avec les juridictions.", "Envoi de SMS ou de courriels.", "Paiement en ligne réel d'amendes : la simulation fonctionne, Airtel est écrit mais non essayé en réel, Moov n'est pas construit."]) + "\n"
    s += GEN_LOGOUT
    o.write("01_MANUEL_GENERAL/01_Manuel_general.md", s)
