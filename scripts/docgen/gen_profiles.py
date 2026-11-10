# -*- coding: utf-8 -*-
import re
from lib import *
import c_actions

GEN_LOGIN = """### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

"""
NOT_BUILT = """## Fonctions que le système ne propose pas (encore)

Pour éviter toute confusion, voici ce que vous ne trouverez **pas** dans les menus, même si vous en avez l'habitude dans le travail : un registre de **main courante** distinct (le module Incidents s'en rapproche), les **procès-verbaux d'audition et déclarations**, un écran **Enquêtes** dédié, un transfert de **dossier entre commissariats** avec acceptation ou refus, les **rapports** et **statistiques** généraux (seuls le tableau de bord et les rapports de recettes existent), les **archives/documents**, la recherche globale, l'envoi de SMS ou de courriels.

"""
GEN_LOGOUT = """### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

"""

def shift(text, n):
    return re.sub(r'(?m)^(#{1,5}) ', lambda m: '#' * (len(m.group(1)) + n) + ' ', text) if n else text

def kpis(p):
    return [lab for c, lab in R.KPI if c in p]

def sheet(code, depth=1):
    r = ROLES[code]; p = rperms(code)
    fr, fam = ROLE[code]
    sup, dest = R.HIER[code]
    s = f"## Fiche d'identité du profil\n\n"
    s += table(["Élément", "Valeur"], [
        ("Type de compte (code système)", f"`{code}`"), ("Fonction", fr), ("Famille", fam),
        ("Niveau hiérarchique (périmètre)", SCOPE[r["scopeLevel"]]),
        ("Service d'affectation", "Celui du compte (commissariat, délégation, direction) : il fixe ce que l'utilisateur voit"),
        ("Second facteur exigé par le rôle", "Oui" if r["requiresMfa"] else "Non (peut être exigé si l'utilisateur détient un droit sensible)"),
        ("Supérieur hiérarchique (selon le périmètre du système)", sup + " — organigramme officiel à confirmer"), ("Destinataires de ses rapports et transmissions", dest),
        ("Nombre de droits", f"{len(p)} sur 157"), ("Droits sensibles détenus", str(len(p & SENS))),
        ("Comptes de démonstration", ", ".join(f"`{u}`" for u in accounts_of(code)) or "Aucun")]) + "\n"
    s += f"**Responsabilité :** {R.DESC[code]}\n\n"
    s += "## Modules accessibles (menu)\n\n"
    nv = nav_for(code)
    s += "".join(f"- **{t}** : " + ", ".join(items) + "\n" for t, items in nv) if nv else "Aucun module au menu.\n"
    s += "\n"
    k = kpis(p)
    s += "## Tableau de bord\n\nCe profil voit, **dans son périmètre**, : " + ("; ".join(k) + ".\n\n" if k else "aucun chiffre opérationnel (les chiffres sans droit ne sont jamais affichés).\n\n")
    s += "## Opérations autorisées (par module)\n\n"
    rows = []
    for m, codes in groups_of(p):
        rows.append((mlabel(m), "; ".join(plabel(c) for c in codes)))
    s += table(["Module", "Opérations autorisées"], rows) + "\n"
    s += "Les droits marqués *(sensible)* n'agissent que si le compte a l'habilitation requise (droit sensible = habilitation « Sensible » ou « Confidentiel », attribuée par l'administrateur de sécurité).\n\n"
    miss = [lab for c, lab in R.KEYOPS if c not in p]
    s += "## Opérations interdites (principales)\n\n" + ("Ce profil **ne peut pas** : " + " ; ".join(miss) + ".\n\n" if miss else "Aucune des opérations clés listées n'est interdite.\n\n")
    s += "Toute opération qui n'est pas dans la liste des opérations autorisées est refusée par le système.\n\n"
    s += "## Documents\n\n"
    def lst(m):
        return [v for c, v in m.items() if c in p]
    s += table(["Il peut…", "Documents"], [("Créer", "; ".join(lst(R.DOC_CREATE)) or "—"), ("Consulter", "; ".join(lst(R.DOC_VIEW)) or "—"), ("Transmettre", "; ".join(lst(R.DOC_SEND)) or "—"), ("Valider / décider", "; ".join(lst(R.DOC_VALID)) or "—")]) + "\n"
    n = [v for c, v in R.NOTIF.items() if c in p]
    s += "## Notifications reçues\n\n" + (bullets(n) if n else "Aucune notification métier propre à ce profil (les notifications de sécurité sur son propre compte lui parviennent toujours).\n") + "\n"
    return s

def procedures(code):
    p = rperms(code)
    seen, out = set(), ""
    cur = None
    for a in c_actions.A:
        if a["perm"] in p and a["title"] not in seen:
            seen.add(a["title"])
            if a["group"] != cur:
                out += f"## Procédures — {a['group']}\n\n"; cur = a["group"]
            out += f"### {a['title']}\n\n" + numbered(a["steps"]) + (f"\n> **À savoir :** {a['tip']}\n" if a["tip"] else "") + "\n"
    return out or "Aucune procédure spécifique : ce profil consulte.\n\n"

SHOTS = {
    "NATIONAL_COMMANDER": [("theme-dashboard.png", "Tableau de bord"), ("theme-approvals.png", "Approbations"), ("s4-1-supervision-nationale.png", "Supervision nationale des alertes")],
    "REGIONAL_COMMANDER": [("prov-1-organization.png", "Organisation : provinces et délégués"), ("theme-dashboard.png", "Tableau de bord")],
    "STATION_COMMANDER": [("theme-complaints.png", "Plaintes"), ("theme-cases.png", "Affaires"), ("s1-5-verification-chef.png", "Vérification d'un avis par le chef")],
    "INVESTIGATOR": [("s1-1-formulaire-enqueteur.png", "Formulaire de l'enquêteur"), ("theme-cases.png", "Affaires")],
    "DESK_OFFICER": [("theme-complaint-new.png", "Nouvelle plainte"), ("theme-persons.png", "Personnes")],
    "SUPER_ADMIN": [("aud-10-tech-admin-menu.png", "Menu de l'administrateur technique"), ("aud-11-tech-admin-refused.png", "Accès refusé aux données de police")],
    "SECURITY_ADMIN": [("theme-security.png", "Centre de sécurité"), ("aud-1-chain-and-keys.png", "Contrôle de la chaîne d'audit et clés d'accès")],
}

# texte propre à chaque manuel (rôle principal -> intro)
PROFILES = [
    dict(n=1, file="01_Manuel_du_Directeur_general", title="Manuel du Directeur général", roles=["NATIONAL_COMMANDER"],
         public="Directeur général de la Police nationale et ses adjoints, dans la mesure où ils portent le profil « Commandement national ».",
         resp=["Superviser l'ensemble du territoire (données nationales en lecture).", "Approuver mandats, avis de recherche, opérations et rapports, et décider des approbations sensibles (comptes, rôles, habilitations).", "Suivre la diffusion nationale des alertes et les escalades.", "Valider les mutations en tant qu'autorité compétente lorsque le droit est détenu."],
         note="Le système ne distingue pas le Directeur général de ses adjoints : tous portent le même profil de commandement national. L'attribution fine (qui approuve quoi) reste à confirmer par la Direction.",
         conf=["Répartition des pouvoirs d'approbation entre Directeur général et adjoints.", "Fréquence et contenu des rapports attendus de la Direction (les rapports généraux ne sont pas construits)."]),
    dict(n=2, file="02_Manuel_des_Directeurs_centraux", title="Manuel des directeurs centraux", roles=[],
         public="Directeurs des directions centrales (DSP, DLGDEAM, DPTSCI, DIE, DRHM, DITT, DLS, DSPSM, DBCN-IP, DENP, GMIP, GSR, USIP, UNILT).",
         resp=["Superviser les services de leur direction (la structure détaillée est fixée par arrêté ministériel — hors système)."],
         note="**Le système n'a pas de rôle « directeur central ».** Les 14 directions centrales et unités du décret 0572/2023 existent comme unités de l'organisation, mais le compte d'un directeur central porte l'un des rôles à portée nationale existants (voir ci-dessous). Le choix du rôle de chaque directeur est une décision de la Direction ; ce manuel décrit ce que chaque rôle national permet, sans présumer de l'attribution.",
         conf=["Quel rôle attribuer à chaque directeur central (ex. Directeur des ressources humaines = rôle RH).", "Faut-il créer des rôles propres à chaque direction centrale (droits à définir avec la Direction)."], special="central"),
    dict(n=3, file="03_Manuel_des_Delegues_provinciaux", title="Manuel des délégués provinciaux de police", roles=["REGIONAL_COMMANDER"],
         public="Délégués provinciaux de police (23 provinces, un compte par province).",
         resp=["Superviser tous les commissariats de leur province.", "Suivre plaintes, affaires, mandats, arrestations et gardes à vue de la province.", "Rendre compte à la Direction générale.", "Décider des approbations sensibles de leur niveau."],
         note="Un délégué voit toutes les données de sa province et **aucune autre** (vérifié par test automatique sur 12 listes). Sa nomination est faite par décret (art. 94 du décret 0572/2023) ; le système ne gère que son compte.",
         conf=["Les rapports périodiques attendus du délégué vers la Direction générale (non construits)."]),
    dict(n=4, file="04_Manuel_des_Commissaires", title="Manuel des commissaires (chefs de commissariat)", roles=["STATION_COMMANDER"],
         public="Commissaires, chefs de commissariat, et autres responsables portant le profil « commissaire ». Les commissaires adjoints n'ont pas de profil distinct.",
         resp=["Examiner les plaintes et affecter les enquêteurs.", "Contrôler le travail d'enquête, transmettre ou clôturer les affaires.", "Vérifier / approuver mandats et avis de recherche selon les droits du profil.", "Prolonger une garde à vue (droit distinct et sensible).", "Superviser les patrouilles, incidents et la circulation de l'unité."],
         note="Le système n'a pas de profil de **commissaire adjoint** : un adjoint reçoit soit le profil commissaire, soit un profil d'agent selon la décision de la hiérarchie.",
         conf=["Profil du commissaire adjoint et délégation de signature en cas d'absence du commissaire."]),
    dict(n=5, file="05_Manuel_des_Chefs_de_service", title="Manuel des chefs de service", roles=["TRAFFIC_SUPERVISOR", "TRAFFIC_UNIT_HEAD"],
         public="Chefs de service, de poste, de brigade, d'unité ou de département à l'intérieur d'un commissariat.",
         resp=["Encadrer les agents de leur service et contrôler leur travail."],
         note="**Le système n'a pas de rôle générique « chef de service ».** Les seuls profils d'encadrement intermédiaire qui existent sont ceux de la circulation et des recettes (superviseur circulation, chef d'unité recettes), décrits ici. Pour les autres services (accueil, enquête, garde à vue…), le contrôle est assuré par le **commissaire** (voir son manuel). L'organisation interne en « services » n'est pas modélisée : seuls des départements internes (commandement, enquête, patrouille, circulation, police technique, renseignement, garde à vue, logistique, administration, spécial) existent.",
         conf=["Souhaite-t-on un rôle « chef de service » (examen intermédiaire des plaintes, validation avant le commissaire) ? Droits à définir avec la hiérarchie."]),
    dict(n=6, file="06_Manuel_des_OPJ", title="Manuel des officiers de police judiciaire (OPJ)", roles=["OFFICER"],
         public="Officiers de police dotés du profil « Officier de police (OPJ) ».",
         resp=["Enregistrer les contrôles et PV routiers, tenir les fiches conducteurs et véhicules.", "Enregistrer les personnes."],
         note="**Point d'attention.** Dans l'état actuel du système, le profil décrit comme « OPJ » **n'a pas** les droits de créer une plainte, d'ouvrir une affaire, de demander un mandat ou d'enregistrer une arrestation : ces actes relèvent d'autres profils (agent d'accueil, enquêteur, commissaire). Les pouvoirs juridiques propres à l'OPJ ne sont **pas** modélisés.",
         conf=["Quels actes l'OPJ doit pouvoir accomplir dans le système (plaintes, procès-verbaux, arrestations, gardes à vue) : décision de la hiérarchie et du ministère de la Justice.", "Distinction OPJ / agent de police judiciaire (APJ) : non modélisée."]),
    dict(n=7, file="07_Manuel_des_Enqueteurs", title="Manuel des enquêteurs", roles=["INVESTIGATOR"],
         public="Enquêteurs affectés à des affaires.",
         resp=["Instruire les affaires qui leur sont affectées.", "Enregistrer personnes, tâches, notes et pièces à conviction.", "Demander des mandats et enregistrer les arrestations.", "Soumettre l'affaire au contrôle du commissaire."],
         note="Les écrans de procès-verbaux, déclarations et auditions ne sont pas encore construits : les constats se consignent en notes d'affaire.",
         conf=["Forme réglementaire des procès-verbaux d'audition (non construits)."]),
    dict(n=8, file="08_Manuel_des_Agents", title="Manuel des agents de police", roles=["DESK_OFFICER", "PATROL_OFFICER", "TRAFFIC_OFFICER", "TRAFFIC_CONTROL_AGENT", "CUSTODY_OFFICER", "EVIDENCE_CUSTODIAN", "BIOMETRIC_OFFICER", "FORENSIC_OFFICER"],
         public="Agents d'accueil, de patrouille, de circulation, de contrôle routier, de garde à vue, responsables des scellés, agents biométrie et police technique.",
         resp=["Accomplir les tâches de terrain et d'accueil de leur fonction et en rendre compte au commissaire."],
         note="Chaque fonction a sa propre section ci-dessous avec ses droits exacts. **Le profil « agent de police » générique n'existe pas** : l'agent reçoit le profil de sa fonction.",
         conf=["Fonctions non couvertes par un profil (ex. agent de police judiciaire, agent des archives)."]),
    dict(n=9, file="09_Manuel_de_l_Administrateur_technique", title="Manuel de l'administrateur technique", roles=["SUPER_ADMIN", "SECURITY_ADMIN", "POLICE_ADMIN"],
         public="Administrateur technique, administrateur de sécurité et administrateur de la police (système d'information).",
         resp=["Administrateur technique : plate-forme, paramètres, sauvegardes, structure.", "Administrateur de sécurité : comptes, sessions, audit.", "Administrateur de la police : utilisateurs, organisation, circulation, avec droits de commandement."],
         note="**L'administrateur technique n'est PAS un responsable opérationnel ni judiciaire.** Il ne détient aucun droit sur les plaintes, affaires, mandats, arrestations ou avis de recherche. L'administrateur de sécurité gère les comptes et lit le journal, sans autorité opérationnelle. Un administrateur technique ne peut pas valider une opération de police.",
         conf=["Séparation entre administrateur technique et administrateur de sécurité en production (deux personnes différentes)."]),
]

def central_section():
    s = "## Rôles à portée nationale (ce que chacun permet)\n\n"
    rows = []
    for c in ROLE_ORDER:
        if ROLES[c]["scopeLevel"] == "NATIONAL":
            p = rperms(c)
            rows.append((ROLE[c][0], f"`{c}`", len(p), str(sum(len(i) for _, i in nav_for(c))) + " modules au menu", R.DESC[c]))
    s += table(["Fonction", "Code", "Droits", "Menu", "Rôle"], rows) + "\n"
    s += "Pour la fiche détaillée de chaque rôle, voir les fiches du dossier `FICHES_TOUS_LES_ROLES`.\n\n"
    return s

def manual(pr):
    s = front(pr["title"], "Manuel d'utilisation, pas à pas, à partir de ce que le système permet réellement")
    s += f"## À qui s'adresse ce manuel\n\n{pr['public']}\n\n"
    s += f"## Responsabilités\n\n" + bullets(pr["resp"]) + "\n"
    s += f"> {pr['note']}\n\n"
    s += GEN_LOGIN
    s += "### Présentation du tableau de bord\n\nAprès connexion, le **Tableau de bord** résume les chiffres de votre périmètre. Le menu de gauche (ou le bouton de navigation sur téléphone) donne accès aux modules autorisés. Les modules que vous ne voyez pas ne sont pas accessibles à votre profil. Le système est disponible en **français et en arabe** (sélecteur de langue dans l'en-tête).\n\n"
    if pr.get("special") == "central":
        s += central_section()
    multi = len(pr["roles"]) > 1
    for code in pr["roles"]:
        if multi:
            s += f"# Profil : {ROLE[code][0]}" + "\n\n"
        blk = sheet(code) + procedures(code)
        sh = SHOTS.get(code)
        if sh:
            blk += "## Écrans" + "\n\n" + screens(2, sh)
        s += shift(blk, 1 if multi else 0)
    s += NOT_BUILT
    s += GEN_LOGOUT
    s += "## Points à confirmer auprès de la hiérarchie\n\n" + bullets(pr["conf"]) + "\n"
    s += "## Améliorations recommandées\n\n" + bullets(["Rapports périodiques automatiques vers le niveau supérieur (module Rapports non construit).", "Alerte de relance pour les dossiers sans suite (non construite)."]) + "\n"
    return s

def role_file(code):
    s = front(f"Fiche de profil — {ROLE[code][0]}", f"Manuel individuel du profil `{code}`")
    s += sheet(code)
    s += procedures(code)
    s += GEN_LOGIN + GEN_LOGOUT
    s += "## Points à confirmer\n\n- Intitulé officiel de la fonction et rattachement hiérarchique exact.\n"
    return s

def build(o):
    for pr in PROFILES:
        o.write(f"02_MANUELS_PAR_PROFIL/{pr['file']}.md", manual(pr))
    for i, c in enumerate(ROLE_ORDER, 1):
        o.write(f"02_MANUELS_PAR_PROFIL/FICHES_TOUS_LES_ROLES/{i:02d}_{c}.md", role_file(c))
