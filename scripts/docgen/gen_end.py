# -*- coding: utf-8 -*-
from lib import *
import c_workflows, c_modules
from gen_profiles import PROFILES, GEN_LOGIN, GEN_LOGOUT

NOTIFS = [
    ("Plaintes", "Plainte enregistrée / soumise", "Titulaires du droit d'examiner les plaintes du commissariat", "Approbation", "Nouvelle plainte à examiner"),
    ("Plaintes", "Plainte affectée", "L'enquêteur désigné", "Affectation", "Plainte affectée à vous"),
    ("Plaintes", "Plainte clôturée ou rejetée", "L'enquêteur affecté", "Information", "Plainte clôturée / rejetée"),
    ("Affaires", "Affaire créée sans responsable", "Titulaires du droit d'affecter les affaires", "Approbation", "Nouvelle affaire en attente d'affectation"),
    ("Affaires", "Affaire créée avec responsable / issue d'une plainte", "Le responsable", "Affectation", "Nouvelle affaire qui vous est confiée"),
    ("Affaires", "Affectation à l'équipe d'une affaire", "La personne affectée", "Affectation", "Affecté à l'affaire en tant que …"),
    ("Affaires", "Tâche confiée", "La personne désignée", "Affectation", "Tâche affectée à vous"),
    ("Affaires", "Affaire soumise à examen", "Titulaires du droit de clôture", "Approbation", "Affaire en attente d'examen du superviseur"),
    ("Affaires", "Changement de statut", "Le responsable de l'affaire", "Information", "Affaire — nouveau statut"),
    ("Incidents", "Incident de gravité élevée ou critique", "Titulaires du droit de modifier les incidents", "Alerte", "Incident critique / élevé signalé"),
    ("Patrouilles", "Patrouille confiée à un superviseur", "Le superviseur", "Affectation", "Patrouille affectée à vous"),
    ("Alertes nationales", "Avis de recherche actif diffusé", "Unités du périmètre (bandeau rouge)", "Alerte", "Alerte nationale"),
    ("Alertes nationales", "Alerte non prise en compte", "Unité parente et superviseurs régionaux (niveau 1) ; superviseurs nationaux (niveau 2)", "Alerte", "Escalade : avis du réseau sans prise en compte"),
    ("Biométrie", "Vérification humaine demandée", "Titulaires du droit de vérifier", "Alerte", "Une vérification humaine est demandée"),
    ("Biométrie", "Erreur signalée sur un contrôle", "Titulaires du droit de vérifier", "Information", "Une erreur a été signalée"),
    ("Circulation", "Contrôle avec correspondance à un avis de recherche", "Titulaires du droit d'approuver les avis", "Alerte", "Correspondance avec un avis de recherche"),
    ("Circulation", "PV comportant un délit", "Titulaires du droit de gérer les amendes", "Alerte", "PV comportant un délit"),
    ("Circulation", "PV annulé", "L'agent émetteur", "Information", "PV annulé"),
    ("Recettes", "Caisse clôturée", "Titulaires du droit d'examiner les versements", "Information", "Caisse clôturée"),
    ("Recettes", "Versement déclaré", "Titulaires du droit d'examiner les versements", "Information", "Versement à vérifier"),
    ("Recettes", "Versement rejeté / justification demandée", "Agents-caisse de l'unité", "Alerte", "Versement rejeté / Justification demandée"),
    ("Approbations", "Demande d'approbation déposée", "Titulaires du droit de décider (sauf le demandeur)", "Approbation", "Demande d'approbation"),
    ("Approbations", "Demande rejetée", "Le demandeur", "Information", "Approbation rejetée"),
    ("Approbations", "Changement exécuté ou non exécuté", "Le demandeur", "Information", "Changement approuvé exécuté / non exécuté"),
    ("Sécurité", "Rôle modifié", "L'utilisateur concerné", "Sécurité", "Votre rôle a changé — reconnectez-vous"),
    ("Sécurité", "Habilitation modifiée", "L'utilisateur concerné", "Sécurité", "Votre habilitation a changé — reconnectez-vous"),
    ("Sécurité", "Second facteur réinitialisé", "L'utilisateur concerné", "Sécurité", "Votre MFA a été réinitialisé"),
    ("Sécurité", "Demande de réinitialisation de mot de passe", "Titulaires du droit de réinitialiser", "Sécurité", "Réinitialisation demandée"),
    ("Ressources humaines", "Mutation proposée", "Titulaires du droit d'examen RH", "Approbation", "Mutation à examiner"),
    ("Ressources humaines", "Mutation rejetée", "Le proposant", "Information", "Mutation rejetée"),
    ("Ressources humaines", "Mutation exécutée", "L'agent, le proposant, les unités de départ et d'arrivée", "Affectation", "Nouvelle affectation / Agent arrivant / partant"),
    ("Ressources humaines", "Travail à réaffecter après une mutation", "Titulaires du droit d'affecter de l'ancienne unité", "Affectation", "N affaires et N tâches à réaffecter"),
    ("Ressources humaines", "Demande de congé", "Titulaires du droit d'approuver les congés", "Approbation", "Demande de congé à décider"),
    ("Ressources humaines", "Décision sur un congé", "Le demandeur", "Information", "Congé approuvé / rejeté"),
    ("Ressources humaines", "Rotation (échéance proche)", "Titulaires des droits RH", "Échéance", "Agents bientôt éligibles à la rotation"),
    ("Ressources humaines", "Propositions automatiques de mutation", "Titulaires du droit d'examen RH", "Approbation", "Propositions à examiner"),
    ("Organisation", "Nouvelle affectation d'un agent", "L'agent", "Information", "Vous avez été affecté à …"),
]

def build_notifs(o):
    s = front("Catalogue des notifications", "Toutes les notifications internes relevées dans le système")
    s += "**Types :** Information, Affectation, Échéance, Approbation, Alerte, Sécurité. Les notifications apparaissent dans la cloche de l'en-tête (page **Notifications**). Les alertes nationales s'affichent en plus en bandeau rouge. **Aucune notification n'est envoyée par SMS ou courriel.** La liste ci-dessous est celle du code ; tout événement absent n'envoie pas de notification (par exemple une garde à vue qui dépasse son délai, une plainte sans suite).\n\n"
    s += table(["Module", "Événement", "Destinataires", "Type", "Message (résumé)"], NOTIFS) + "\n"
    s += "## Délais de l'alerte nationale\n\n" + table(["Priorité de l'avis", "Relance", "Escalade niveau 1", "Escalade niveau 2", "Acquittement attendu"], [("Ordinaire", "5 min", "15 min", "60 min", "30 min"), ("Haute / extrême", "5 min", "5 min", "15 min", "10 min")]) + "\n"
    s += "## Notifications à ajouter (améliorations recommandées)\n\n" + bullets(["Garde à vue proche ou au-delà de l'échéance légale.", "Plainte restée sans examen au-delà d'un délai à définir.", "Affaire sans mouvement depuis un délai à définir.", "Mandat proche de son expiration."]) + "\n"
    o.write("07_ANNEXES/01_Catalogue_des_notifications.md", s)

GLOSS = [
    ("Acquitter", "Confirmer qu'une alerte a été prise en compte par l'unité ; l'acte est horodaté."), ("Affaire", "Dossier d'enquête ouvert, souvent à partir d'une plainte."), ("Affectation", "Désignation d'une personne pour traiter un dossier."),
    ("Alerte nationale", "Diffusion d'un avis de recherche aux unités concernées, avec accusé de réception et escalade."), ("Amende forfaitaire", "Amende au montant fixé par le catalogue pour une infraction routière."), ("Approbation (demande d')", "Circuit de décision à une ou deux personnes pour les changements sensibles de comptes et de droits."),
    ("Arrestation", "Appréhension d'une personne, enregistrée avec son fondement légal."), ("Audit (journal d')", "Registre inaltérable des actions effectuées dans le système."), ("Avis de recherche", "Diffusion d'une personne recherchée aux unités ; distinct du mandat."),
    ("Brouillon", "Saisie enregistrée mais non soumise."), ("Chaîne de conservation", "Historique des mains par lesquelles passe une pièce à conviction."), ("Clôture", "Fin du traitement avec une issue ; le dossier devient en lecture seule."),
    ("Commissaire", "Chef de commissariat ; dans le système, titulaire du profil de commandement de commissariat."), ("Commissariat", "Unité de police de base ; peut avoir des postes rattachés."), ("Compte", "Accès personnel d'un agent, lié à un rôle et à une unité."),
    ("Contrôle biométrique", "Vérification d'identité par empreinte ou visage ; simulation tant qu'aucun matériel réel n'est connecté."), ("Délégation provinciale", "Direction de la police d'une province ; son chef est le délégué provincial."), ("Délégué provincial", "Responsable de la police d'une province ; supervise les commissariats."),
    ("Dépôt public", "Plainte ou signalement envoyé par un citoyen via le portail, avant conversion par un agent."), ("Droit (permission)", "Autorisation précise d'effectuer une action ; attribuée à un rôle."), ("Écart (de caisse)", "Différence entre le montant attendu et le montant versé ou déclaré."),
    ("Escalade", "Remontée d'une alerte non prise en compte au niveau hiérarchique supérieur."), ("Garde à vue", "Privation de liberté d'une personne arrêtée, avec échéance légale surveillée."), ("Habilitation", "Niveau (Standard, Sensible, Confidentiel) qui conditionne l'usage des droits sensibles."),
    ("Incident", "Évènement signalé (trouble, accident, vol…) enregistré avec lieu et gravité."), ("Journal de surveillance", "Entrées datées sur l'état d'une personne en garde à vue."), ("Main courante", "Registre chronologique des évènements d'un poste ; non construit comme module distinct."),
    ("Mandat", "Acte de l'autorité judiciaire (arrestation, perquisition, détention, citation, saisie) enregistré dans le système."), ("MFA / second facteur", "Code à usage unique de l'application d'authentification, en plus du mot de passe."), ("Mutation", "Changement d'affectation d'un agent, validé par les RH puis par l'autorité."),
    ("Notification", "Message interne signalant une tâche ou un évènement."), ("OPJ", "Officier de police judiciaire ; dans le système, un profil d'officier sans pouvoir judiciaire modélisé."), ("Périmètre", "Étendue territoriale des données visibles : national, province, commissariat."),
    ("Personne recherchée", "Personne faisant l'objet d'un avis de recherche."), ("Pièce à conviction", "Objet saisi ou recueilli, enregistré avec scellé et lieu de stockage."), ("Plainte", "Déclaration de faits par un plaignant, enregistrée au commissariat."),
    ("Plaignant", "Personne qui dépose une plainte."), ("Portail public", "Site accessible au citoyen sans compte."), ("PV (procès-verbal) routier", "Contravention électronique numérotée émise lors d'un contrôle routier."),
    ("Quatre yeux", "Règle selon laquelle celui qui demande ou émet ne peut pas valider."), ("Rapprochement", "Comparaison des versements aux recettes encaissées."), ("Rôle", "Ensemble de droits attribué à un compte."),
    ("Scellé", "Fermeture numérotée d'une pièce à conviction."), ("Sensible (droit, affaire)", "Droit à usage restreint ou affaire à visibilité limitée à son équipe."), ("Session", "Période de connexion d'un utilisateur."),
    ("Statut", "État d'un dossier dans son circuit."), ("Superviseur", "Personne qui contrôle le travail d'une autre."), ("Transmission", "Passage d'une affaire en statut « Transmise » avec l'issue choisie ; l'envoi physique se fait hors système."),
    ("Unité", "Élément de l'organisation : direction, délégation, commissariat, poste, brigade."), ("Versement", "Remise à l'administration de l'argent encaissé par un agent."), ("Habilitation de sécurité", "Voir Habilitation."),
    ("Mise en cause (personne)", "Personne visée par une plainte ; rôle « suspect » dans l'affaire."), ("Parquet", "Autorité judiciaire de poursuite ; hors système, un profil de consultation existe."), ("Décret 0572/2023", "Décret du 11 avril 2023 portant organisation et fonctionnement du ministère de la Sécurité publique et de l'Immigration."),
]

def build_annexes(o):
    s = front("Glossaire professionnel", "Termes de police, de procédure et du système")
    s += table(["Terme", "Définition"], sorted(GLOSS, key=lambda x: x[0].lower())) + "\n"
    o.write("07_ANNEXES/02_Glossaire.md", s)
    build_notifs(o)
    conf, gaps = [], []
    for w in c_workflows.WF:
        conf += [(f"Circuit {w['letter']}", x) for x in w["confirm"]]; gaps += [(f"Circuit {w['letter']}", x) for x in w["gaps"]]
    for m in c_modules.M:
        conf += [(f"Module {m['n']}", x) for x in m["confirm"] if x and x != "Voir circuit A." and not x.startswith("Voir circuit")]; gaps += [(f"Module {m['n']}", x) for x in m["gaps"]]
    for p in PROFILES:
        conf += [(p["title"], x) for x in p["conf"]]
    seen = set(); cu = []
    for a, b in conf:
        if b not in seen: seen.add(b); cu.append((a, b))
    seen = set(); gu = []
    for a, b in gaps:
        if b not in seen: seen.add(b); gu.append((a, b))
    s = front("Points à confirmer et améliorations recommandées", "Liste consolidée à soumettre à la hiérarchie")
    s += "## 1. Points à confirmer auprès de la hiérarchie\n\nCes points sont des décisions **organisationnelles ou judiciaires** : aucune hypothèse n'a été retenue dans le système ni dans la documentation.\n\n" + table(["Origine", "Point à confirmer"], cu) + "\n"
    s += "## 2. Améliorations recommandées\n\nÉléments absents du système actuel ; leur construction suppose confirmation préalable.\n\n" + table(["Origine", "Amélioration ou limite"], gu) + "\n"
    s += "## 3. Interrupteur temporaire à lever avant la mise en service\n\nLe second facteur est suspendu sur l'installation de démonstration (variable de configuration temporaire). Il doit être rétabli avant toute mise en service.\n"
    o.write("07_ANNEXES/03_Points_a_confirmer_et_ameliorations.md", s)
    s = front("Index des captures d'écran", "Captures réelles de l'application (installation de démonstration, données fictives)")
    names = sorted(p.name for p in (ROOT / "07_ANNEXES/captures").glob("*.png"))
    s += f"{len(names)} captures réelles sont fournies dans `07_ANNEXES/captures/`. **Aucune capture n'a été fabriquée.** Les captures `doc-*.png` (Incidents, Patrouilles, Pièces, Ressources humaines, Recettes, Paiements en ligne, Notifications, Circulation…) ont été ajoutées ensuite par connexion de comptes fictifs sur l'installation de **démonstration** (script `scripts/docgen/captures.ts`), ce qui a créé des sessions dans la base de démonstration et nulle part ailleurs. La base de démonstration ne contient pas de recettes encaissées : les écrans de recettes montrent des compteurs à zéro.\n\n"
    s += table(["Fichier", "Série"], [(n, "Complément (installation de démonstration)" if n.startswith("doc-") else "Parcours de démonstration" if n[0] in "se" else "Audit de sécurité" if n.startswith("aud") else "Recherche" if n.startswith(("srch", "look")) else "Écrans de l'application" if n.startswith("theme") else "Autre") for n in names]) + "\n"
    o.write("07_ANNEXES/04_Index_des_captures.md", s)

# ------------------------------------------------------------------ FORMATION
def build_training(o):
    s = front("Guide de formation des utilisateurs", "Formation des policiers au SIGEC-PN / SIGPN-T — cascade nationale")
    s += "> Les durées, effectifs et dispositifs de ce guide sont des **propositions** de l'éditeur, à valider par la Direction. Les procédures décrites, elles, sont celles du système.\n\n"
    s += "## 1. Objectifs\n\nÀ l'issue de la formation, chaque agent sait se connecter en sécurité, utiliser les modules de son profil, respecter les règles de validation et reconnaître ce que le système ne fait pas.\n\n"
    s += "## 2. Environnement de formation\n\nToujours sur l'installation de **démonstration** (données fictives) ; **jamais en production**. Les comptes de démonstration sont listés ci-dessous ; le mot de passe de démonstration est remis séparément aux formateurs. Un script de remise à zéro restaure l'installation avant chaque session.\n\n"
    s += "## 3. Dispositif en cascade proposé (14 000 policiers)\n\n" + table(["Niveau", "Qui", "Effectif indicatif", "Durée proposée", "Contenu"], [
        ("1 — Formateurs nationaux", "Équipe TECHNOTCHAD + cadres désignés par la Direction", "20 à 30", "5 jours", "Tous les manuels, circuits, sécurité, animation"),
        ("2 — Formateurs relais", "Un à deux par province (23 provinces) et par direction centrale", "50 à 80", "3 jours", "Manuel de leur public + pédagogie"),
        ("3 — Sessions de commissariat", "Tous les agents, par groupes de 15 à 20", "≈ 14 000", "1 jour (agents) à 2 jours (commissaires, enquêteurs)", "Parcours de leur profil (section 4)"),
        ("4 — Accompagnement", "Période de double commande puis assistance", "—", "À définir", "Questions, corrections, retours d'expérience")]) + "\n"
    s += "## 4. Parcours par profil\n\n" + table(["Profil", "Manuel", "Travaux pratiques", "Durée proposée"], [
        ("Direction générale / directeurs centraux", "01, 02", "TP1, TP8, TP10", "½ jour"), ("Délégués provinciaux", "03", "TP1, TP4, TP8, TP10", "1 jour"), ("Commissaires", "04", "TP1–TP5, TP8, TP9", "2 jours"),
        ("Enquêteurs", "07", "TP1–TP3, TP5, TP9", "2 jours"), ("Agents d'accueil", "08", "TP1, TP2, TP6, TP9", "1 jour"), ("Agents de patrouille", "08", "TP1, TP6, TP9", "1 jour"), ("Agents de circulation et recettes", "08, 09 (fiches)", "TP1, TP7, TP9", "1 jour"),
        ("Garde à vue et scellés", "08", "TP1, TP5, TP9", "1 jour"), ("Administrateurs", "09", "TP1, TP8, TP9", "2 jours")]) + "\n"
    comptes = {a["username"] for a in ACCOUNTS}
    def acc(*u):
        return ", ".join(f"`{x}`" for x in u if x in comptes)
    s += "## 5. Travaux pratiques\n\n"
    tps = [
        ("TP1 — Connexion, navigation, déconnexion", "Tout public", acc("desk.cs1"), ["Se connecter et changer de langue.", "Repérer le menu, la cloche, Mon compte.", "Ouvrir le tableau de bord.", "Se déconnecter."], "Le stagiaire sait où il est et se déconnecte sans aide."),
        ("TP2 — Une plainte de bout en bout", "Accueil, commissaires, enquêteurs", acc("desk.cs1", "chief.cs1", "inv.diallo"), ["Accueil : créer la personne puis la plainte, soumettre.", "Commissaire : examiner, affecter à l'enquêteur.", "Enquêteur : lire la notification, convertir en affaire, ajouter une tâche, soumettre à examen.", "Commissaire : contrôler et clôturer avec une issue."], "La plainte atteint Clôturée, l'affaire Clôturée ; l'historique montre chaque acteur."),
        ("TP3 — Un avis de recherche à quatre yeux", "Enquêteurs, commissaires, direction", acc("inv.diallo", "chief.cs1", "commander.national"), ["Enquêteur : créer l'avis en brouillon.", "Constater qu'il ne peut ni le vérifier ni l'approuver.", "Commissaire : vérifier. Commandement : approuver.", "Observer la diffusion de l'alerte."], "L'avis est Actif et diffusé ; les refus du système sont compris."),
        ("TP4 — Recevoir et acquitter une alerte", "Tous les agents d'unité, délégués", acc("desk.abe", "chief.abe", "commander.central"), ["Voir le bandeau rouge.", "Marquer comme lu puis acquitter.", "Superviseur : suivre l'état de chaque unité."], "L'alerte est acquittée, l'horodatage est visible."),
        ("TP5 — Arrestation et garde à vue", "Enquêteurs, gardes à vue, commissaires", acc("inv.diallo", "custody.cs1", "chief.cs1"), ["Enregistrer une arrestation sur mandat actif.", "Ouvrir la garde à vue et remplir le journal.", "Commissaire : prolonger avec autorité et motif.", "Clore avec une issue ; vérifier le statut du mandat."], "Arrestation et mandat mis à jour ; la prolongation n'est pas possible pour l'agent de garde."),
        ("TP6 — Incident et patrouille", "Accueil, patrouille", acc("patrol.cs1", "desk.cs1"), ["Signaler un incident de gravité élevée : constater la notification.", "Passer l'incident à Résolu avec un rapport.", "Créer, démarrer et terminer une patrouille."], "Incident Clôturé ; patrouille Terminée avec rapport."),
        ("TP7 — Contrôle routier, PV et paiement", "Circulation et recettes", acc("traffic.cs1", "traffic.supervisor", "finance.central"), ["Enregistrer un contrôle et émettre un PV avec preuve.", "Enregistrer le paiement et vérifier le reçu.", "Superviseur : annuler un PV (observer la notification).", "Recettes : clôturer une caisse, déclarer et valider un versement."], "Amende Payée, reçu REC-… ; versement validé."),
        ("TP8 — Validations et approbations", "Administration, commandement", acc("police.admin", "security.admin", "commander.national"), ["Demander la création d'un compte.", "Constater que le demandeur ne peut pas l'approuver.", "Faire approuver par le commandant puis exécuter.", "Consulter le journal d'audit."], "Compte créé après approbation ; trace complète."),
        ("TP9 — Sécurité au quotidien", "Tous", "", ["Choisir un mot de passe conforme.", "Repérer les tentatives d'hameçonnage (ne jamais communiquer son mot de passe ni son code).", "Verrouiller et fermer sa session.", "Comprendre pourquoi tout est journalisé."], "Le stagiaire énonce les 10 règles d'or."),
        ("TP10 — Supervision d'une province", "Délégués, commandement", acc("commander.central", "commander.national"), ["Comparer ce que voit un délégué et ce que voit le national.", "Filtrer par commissariat.", "Constater qu'un délégué ne voit pas les autres provinces."], "Périmètre compris."),
    ]
    for t, pub, a, steps, res in tps:
        s += f"### {t}\n\n**Public :** {pub}. **Comptes :** {a or '—'}.\n\n" + numbered(steps) + f"\n**Résultat attendu :** {res}\n\n"
    s += "## 6. Les 10 règles d'or\n\n" + numbered(["Mon compte est personnel : je ne prête ni mot de passe ni code.", "Je me déconnecte en quittant le poste.", "Je cherche avant de créer (personnes, avis) pour éviter les doublons.", "Je saisis les faits tels qu'ils sont, sans jugement.", "Une alerte ou une correspondance n'est pas une preuve : je vérifie l'identité.", "Celui qui demande ne valide pas : je respecte les quatre yeux.", "Je motive toujours un rejet, une annulation, une libération, une prolongation.", "Je n'efface rien : je change le statut.", "Une affaire sensible reste entre les membres de son équipe.", "En cas de doute : je demande à mon supérieur ou à l'administrateur de sécurité."]) + "\n"
    qcm = [
        ("Combien de caractères au minimum pour un mot de passe ?", "12", ["6", "8", "12", "20"]), ("Après combien d'échecs de connexion le compte est-il verrouillé ?", "5", ["3", "5", "10", "jamais"]), ("Qui peut approuver un mandat que vous avez demandé ?", "Une autre personne habilitée", ["Vous-même", "Une autre personne habilitée", "Personne", "L'administrateur technique"]),
        ("Un avis de recherche peut-il être vérifié par son émetteur ?", "Non", ["Oui", "Non", "Seulement le soir", "Seulement le DG"]), ("Que signifie « Convertie » pour une plainte ?", "Elle est devenue une affaire", ["Elle est supprimée", "Elle est devenue une affaire", "Elle est publiée", "Elle est rejetée"]),
        ("Peut-on supprimer un paiement saisi par erreur ?", "Non, on l'annule", ["Oui", "Non, on l'annule", "Oui avec mot de passe", "Oui après 24 h"]), ("Une alerte de correspondance prouve-t-elle la culpabilité ?", "Non, vérification humaine obligatoire", ["Oui", "Non, vérification humaine obligatoire", "Oui si urgente", "Oui si nationale"]),
        ("Quelle est l'échéance légale de garde à vue enregistrée dans le système ?", "48 heures (à confirmer)", ["12 heures", "24 heures", "48 heures (à confirmer)", "72 heures"]), ("Qui peut prolonger une garde à vue ?", "Un titulaire du droit de prolongation", ["Tout agent", "Un titulaire du droit de prolongation", "Le plaignant", "Personne"]),
        ("L'administrateur technique peut-il approuver un mandat ?", "Non", ["Oui", "Non", "Oui en urgence", "Oui s'il est national"]), ("Un délégué provincial voit-il les autres provinces ?", "Non", ["Oui", "Non", "Seulement les voisines", "Seulement en lecture"]),
        ("Que faire si le code du second facteur est refusé ?", "Attendre le code suivant", ["Réessayer le même", "Attendre le code suivant", "Changer de téléphone", "Appeler le DG"]), ("Combien de temps un compte sensible peut-il rester inactif ?", "15 minutes", ["5 minutes", "15 minutes", "60 minutes", "10 heures"]),
        ("Le module « Main courante » existe-t-il ?", "Non, seul le module Incidents s'en rapproche", ["Oui", "Non, seul le module Incidents s'en rapproche", "Oui pour les OPJ", "Oui pour le DG"]), ("Le système envoie-t-il des SMS ?", "Non", ["Oui", "Non", "Oui pour les alertes", "Oui pour les plaintes"]),
        ("Qui est notifié quand une plainte est soumise ?", "Les titulaires du droit d'examen du commissariat", ["Le plaignant", "Les titulaires du droit d'examen du commissariat", "Le DG", "Personne"]), ("Que devient une affaire clôturée ?", "Elle passe en lecture seule", ["Elle est supprimée", "Elle passe en lecture seule", "Elle est rouverte automatiquement", "Elle est publiée"]),
        ("Un dépôt du portail public crée-t-il une plainte officielle automatiquement ?", "Non, un agent le convertit", ["Oui", "Non, un agent le convertit", "Oui si urgent", "Oui après 24 h"]), ("Que doit contenir un rejet de mandat ?", "Un motif", ["Rien", "Un motif", "Une photo", "Une signature papier"]),
    ]
    s += "## 7. Évaluation — QCM (20 questions)\n\n" + "".join(f"**{i}.** {q}\n\n" + bullets(opts) + "\n" for i, (q, a, opts) in enumerate(qcm, 1))
    s += "### Corrigé\n\n" + numbered([f"{a}" for q, a, o_ in qcm]) + "\n"
    s += "## 8. Grille d'évaluation pratique\n\n" + table(["Critère", "Acquis", "À revoir"], [("Se connecte et se déconnecte seul", "", ""), ("Retrouve un dossier avec les filtres", "", ""), ("Réalise la procédure de son profil sans aide", "", ""), ("Respecte la règle des quatre yeux", "", ""), ("Motive correctement une décision", "", ""), ("Explique ce qu'une alerte n'établit pas", "", "")]) + "\n"
    s += "## 9. Supports\n\nManuels du dossier `02_MANUELS_PAR_PROFIL`, circuits du dossier `04_WORKFLOWS`, glossaire, catalogue des notifications, fiche des 10 règles d'or à afficher en poste.\n"
    o.write("06_GUIDE_FORMATION/01_Guide_de_formation.md", s)
