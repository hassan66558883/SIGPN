# -*- coding: utf-8 -*-
"""Les 20 modules demandés. `dispo` : D = disponible, P = partiel, N = non construit (le menu ne l'affiche pas)."""
M = []
def add(**k): M.append(k)

add(n=1, key="utilisateurs", title="Gestion des utilisateurs et des comptes", dispo="D", url="/admin/users", perms=["users", "roles", "permissions", "approvals", "apikeys"],
    objectif="Créer et administrer les comptes d'accès, attribuer les rôles et les habilitations, suivre les sessions, réinitialiser les mots de passe, désactiver un compte.",
    fonctions=["Liste des comptes avec filtres (statut, rôle, commissariat) et recherche.", "Création d'un compte : identifiant, nom, prénom, courriel, rôle, commissariat de rattachement. Le formulaire ne propose que les rôles que l'administrateur connecté a le droit d'attribuer.", "Statuts d'un compte : En attente, Actif, Verrouillé, Suspendu, Désactivé.", "Émission d'un lien de réinitialisation de mot de passe ; réinitialisation du second facteur.", "Voir et révoquer les sessions d'un compte.", "Catalogue des rôles (29 rôles du système) et des droits (157 droits) consultable ; les droits d'un rôle ne se modifient qu'avec approbation.", "Demandes d'approbation (création de compte, changement de rôle, élévation d'habilitation, ajout d'un droit sensible à un rôle) : voir circuit G."],
    forms=[("Nouveau compte", "Identifiant ; prénom ; nom ; courriel ; rôle ; commissariat ; habilitation (fixée à Standard pour les comptes créés par un tiers)."), ("Réinitialisation du mot de passe", "Émission d'un lien à usage unique ; l'utilisateur choisit son nouveau mot de passe.")],
    etapes=["Administration > Utilisateurs > Nouveau.", "Renseigner l'identité et choisir le rôle autorisé.", "Soumettre : une demande d'approbation est créée (code 202 côté système) et attend la décision d'un commandant habilité.", "Après approbation, le compte est créé ; l'utilisateur reçoit un mot de passe provisoire à changer à la première connexion (et enrôle son second facteur si son rôle l'exige).", "Pour désactiver : ouvrir la fiche > changer le statut."],
    resultats="Un compte actif rattaché à un rôle, un commissariat et une habilitation ; trace complète dans le journal d'audit.",
    screens=[("theme-user-new.png", "Formulaire de nouveau compte"), ("aud-4-user-form.png", "Rôles proposés selon les droits de l'administrateur"), ("aud-5-request-sent.png", "Demande envoyée en approbation"), ("theme-roles.png", "Catalogue des rôles"), ("aud-3-role-locked.png", "Rôle verrouillé")],
    confirm=["Le processus de remise du premier mot de passe aux agents (en main propre, par le chef) est à fixer par la hiérarchie.", "Le circuit de création de comptes pour 14 000 agents (import en masse) n'est pas décrit : un import de masse n'existe pas dans l'interface actuelle."],
    gaps=[])

add(n=2, key="commissariats", title="Gestion des commissariats", dispo="D", url="/admin/organization", perms=["org", "officers"],
    objectif="Tenir la structure organisationnelle de la police : unités (siège, délégations, directions centrales, commissariats, postes, brigades, unités spéciales), leur hiérarchie, leur statut et leurs agents.",
    fonctions=["Arborescence des unités : une unité est rattachée à une unité parente.", "Types d'unité : Siège, Délégation, Direction centrale, Direction provinciale, Direction départementale, Commissariat central, Commissariat, Poste, Unité, Brigade, Unité spéciale.", "Statuts : Actif, Inactif, En construction, Planifié.", "Référentiel territorial : provinces, départements, communes, sous-préfectures, arrondissements, localités (quartiers, villages, cantons).", "Fiches agents rattachées à une unité (grade, matricule, statut de service).", "Départements internes d'une unité (commandement, enquête, patrouille, circulation, police technique, renseignement, garde à vue, logistique, administration, spécial)."],
    forms=[("Unité", "Code ; nom ; type ; unité parente ; commune ou localité ; statut ; coordonnées."), ("Département d'unité", "Code (lettres, chiffres, _ -) ; nom ; description ; actif.")],
    etapes=["Administration > Organisation.", "Choisir l'unité dans l'arborescence.", "Créer ou modifier l'unité (droit « gérer l'organisation »).", "Rattacher les agents."],
    resultats="Une structure à jour qui détermine le périmètre de chaque agent (ce qu'il voit et ce qu'il peut faire).",
    screens=[("prov-1-organization.png", "Écran Organisation : provinces, délégués provinciaux et couverture")],
    confirm=["L'organigramme détaillé de chaque direction et service est fixé par arrêté ministériel (art. 91 du décret 0572/2023) : seule l'arborescence générale (14 directions centrales et unités du décret) est chargée ; la structure détaillée au niveau commissariat doit être fournie.", "Les unités de niveau 'service' d'un commissariat ne sont pas des unités distinctes dans le système (départements internes seulement)."],
    gaps=[])

add(n=3, key="delegations", title="Gestion des délégations provinciales", dispo="P", url="/admin/organization", perms=["org"],
    objectif="Rattacher chaque commissariat à sa province et disposer d'un délégué provincial qui supervise tous les commissariats de sa province.",
    fonctions=["23 provinces au référentiel ; chaque province a un compte de délégué provincial (rôle « Délégué provincial de police », périmètre provincial).", "L'écran Organisation affiche la colonne « Délégué provincial » et alerte si une province n'en a pas.", "Le délégué voit toutes les données de sa province (plaintes, affaires, mandats, arrestations, agents, etc.) et aucune autre."],
    forms=[], etapes=["Administration > Organisation : consulter la couverture par province.", "Le compte du délégué est créé comme tout compte (module 1), avec le rôle Délégué provincial et la province."],
    resultats="Une supervision provinciale à périmètre strict, prouvée par test automatique (le délégué ne voit pas les autres provinces).",
    screens=[("prov-1-organization.png", "Couverture par province")],
    confirm=["Il n'existe pas de module « Délégations provinciales » à part : c'est l'écran Organisation et le rôle Délégué provincial qui en tiennent lieu.", "La nomination du délégué est faite par décret (art. 94) : le système ne gère que son compte."], gaps=[])

add(n=4, key="plaintes", title="Gestion des plaintes", dispo="D", url="/complaints", perms=["complaints", "intake", "public"],
    objectif="Enregistrer, examiner, affecter, convertir en affaire ou clore les plaintes reçues au commissariat ou déposées sur le portail public.",
    fonctions=["Liste filtrée (statut, priorité, catégorie, période, recherche).", "Création : brouillon ou enregistrement immédiat.", "Examen, affectation, conversion en affaire, clôture ou rejet avec motif.", "Plainte anonyme possible.", "Journal d'audit de chaque action."],
    forms=[("Nouvelle plainte", "Plaignant (ou anonyme) ; catégorie (20) ; titre (5–200 car.) ; description (20–5000 car.) ; date de l'incident ; lieu (≤300 car.) ; commissariat ; priorité (Basse/Normale/Haute/Urgente)."), ("Examiner", "Observations (≤2000 car.) ; priorité."), ("Affecter", "Enquêteur ; observations."), ("Clôturer / rejeter", "Issue (Clôturée ou Rejetée) ; motif (5–1000 car.)."), ("Convertir en affaire", "Titre ; enquêteur responsable ; affaire sensible (case).")],
    etapes=["Plaintes > Nouvelle plainte.", "Choisir ou créer le plaignant.", "Renseigner les faits ; Enregistrer et soumettre.", "Le commissaire examine, affecte, convertit ou clôture."],
    resultats="Une plainte numérotée CMP-AAAA-NNNNN, avec statut, responsable, historique ; éventuellement une affaire liée.",
    screens=[("theme-complaints.png", "Liste des plaintes"), ("theme-complaint-new.png", "Nouvelle plainte")],
    confirm=["Voir circuit A."], gaps=[], wf="A_plainte")

add(n=5, key="plaintes_en_cours", title="Gestion des plaintes en cours", dispo="P", url="/complaints", perms=["complaints", "cases", "investigations"],
    objectif="Suivre les plaintes et affaires non encore closes : en attente d'examen, affectées, en enquête, en attente de contrôle.",
    fonctions=["Pas de module séparé : filtres par statut sur Plaintes et Affaires, Mes tâches, compteurs du tableau de bord.", "Notifications d'affectation et de contrôle (circuit E)."],
    forms=[], etapes=["Filtrer Plaintes par statut (Enregistrée, En examen, Affectée).", "Filtrer Affaires par statut (Ouverte, Affectée, En enquête, En attente d'examen).", "Ouvrir Mes tâches pour l'avancement."],
    resultats="Une vue de pilotage des dossiers vivants dans le périmètre.", screens=[("theme-cases.png", "Liste des affaires"), ("theme-dashboard.png", "Tableau de bord")],
    confirm=["Délais de traitement attendus."], gaps=["Pas de relance automatique des dossiers en retard."], wf="E_plaintes_en_cours")

add(n=6, key="mains_courantes", title="Gestion des mains courantes", dispo="N", url="/incidents (module voisin)", perms=["incidents"],
    objectif="**Aucun module « main courante » n'existe.** Le module Incidents enregistre les évènements signalés et s'en rapproche.",
    fonctions=["Voir le module Incidents (circuit C)."], forms=[("Nouvel incident", "Type (12) ; gravité (4) ; titre ; description ; lieu ; coordonnées ; commissariat ; patrouille.")],
    etapes=["Incidents > Nouvel incident.", "Compléter le rapport d'intervention en cas de résolution."], resultats="Un incident numéroté INC-AAAA-NNNNN.",
    screens=[], confirm=["Faut-il un registre de main courante distinct de l'incident ?"], gaps=["Registre de main courante non construit."], wf="C_main_courante")

add(n=7, key="infractions", title="Gestion des infractions", dispo="P", url="/traffic", perms=["traffic", "cash"],
    objectif="Constater et traiter les infractions routières (contrôle, PV électronique, amende, paiement) ; les infractions pénales passent par plaintes et affaires.",
    fonctions=["Contrôles routiers, PV électroniques numérotés, preuves jointes.", "Catalogue des infractions et barèmes d'amendes forfaitaires.", "Fiches conducteurs et véhicules (documents, historique).", "Amendes, paiements, reçus ; paiement en ligne.", "Tableau de bord et exports."],
    forms=[("Contrôle routier / PV", "Conducteur ; véhicule ; lieu ; résultat (conforme / infraction) ; infractions du catalogue ; preuves."), ("Paiement", "Amende ; mode (espèces, électronique, mobile money, virement) ; montant.")],
    etapes=["Circulation > Contrôles > Nouveau contrôle.", "Choisir les infractions et joindre les preuves.", "Émettre le PV.", "Suivre l'amende et le paiement."],
    resultats="PV (PV-AAAA-NNNNNN), amende (AMD-…), reçu (REC-…).", screens=[("theme-traffic.png", "Tableau de bord circulation")],
    confirm=["Barèmes et liste des délits non arbitrables."], gaps=["Pas de catalogue d'infractions pénales."], wf="D_infractions")

add(n=8, key="mandats", title="Gestion des mandats d'arrêt", dispo="D", url="/warrants", perms=["warrants"],
    objectif="Enregistrer les mandats (arrestation, perquisition, détention, citation, saisie), les faire approuver, les exécuter ou les annuler.",
    fonctions=["Demande de mandat, approbation (quatre yeux), rejet motivé, exécution, annulation motivée.", "Expiration : un mandat expiré ne s'approuve pas.", "Lien avec les avis de recherche et les arrestations."],
    forms=[("Demande de mandat", "Type ; personne ; affaire ; autorité émettrice (3–200 car.) ; référence ; motifs (10–3000 car.) ; adresse visée ; date d'expiration."), ("Décision", "Statut (Actif, Rejeté, Exécuté, Annulé) ; observations (motif obligatoire pour rejet/annulation).")],
    etapes=["Mandats > Nouveau mandat.", "Un autre responsable approuve.", "À l'exécution : marquer « Exécuté »."], resultats="Mandat WRT-AAAA-NNNNN, statut et historique.",
    screens=[("enf-1-warrant-form.png", "Demande"), ("enf-2-warrant-draft.png", "Brouillon"), ("enf-3-warrant-active.png", "Actif"), ("enf-8-warrant-executed.png", "Exécuté")], confirm=["Voir circuit B."], gaps=[], wf="B_mandat")

add(n=9, key="recherches", title="Gestion des personnes recherchées", dispo="D", url="/wanted", perms=["wanted", "alerts", "biometric"],
    objectif="Émettre, vérifier, approuver et diffuser les avis de recherche, rechercher une personne dans la base nationale et traiter les alertes reçues.",
    fonctions=["Recherche rapide et avancée (nom, alias, numéro, plaque) avec résultats : correspondance, connu, aucun résultat.", "Création d'avis (brouillon), vérification, approbation, diffusion par alertes avec relances et escalades.", "Statuts : brouillon, en attente d'approbation, actif, localisé, arrêté, suspendu, annulé, expiré.", "Publication sur le site public sur validation expresse.", "Supervision nationale de la diffusion (unités hors ligne, escalades).", "Contrôle d'identité biométrique en simulation avec décision humaine."],
    forms=[("Nouvel avis", "Personne ; infraction ; nature ; niveau de danger ; périmètre de diffusion ; base légale ; autorité ; motif ; dernière localisation ; expiration."), ("Observation sur un avis", "Lieu, source, notes."), ("Véhicule associé", "Plaque, marque, modèle, couleur, année.")],
    etapes=["Personnes recherchées > Nouvel avis.", "Vérification par un autre agent.", "Approbation par l'autorité.", "Diffusion automatique ; accusés de réception des unités."],
    resultats="Avis WNT-AAAA-NNNNN actif et diffusé aux unités concernées.",
    screens=[("srch-1-first-visit.png", "Recherche : première visite"), ("srch-2-match.png", "Résultat avec correspondance"), ("srch-5-advanced-form.png", "Recherche avancée"), ("s1-7-avis-actif-diffuse.png", "Avis actif"), ("s2-1-abeche-liste-alertes.png", "Alertes d'une unité"), ("s4-1-supervision-nationale.png", "Supervision nationale")],
    confirm=["Voir circuit B."], gaps=["Sources frontières, vidéosurveillance et interopérabilité non connectées (affichées « non connecté »)."], wf="B_mandat")

add(n=10, key="arrestations", title="Gestion des arrestations", dispo="D", url="/arrests", perms=["arrests"],
    objectif="Enregistrer les arrestations avec leur fondement légal et suivre leur issue.",
    fonctions=["Fondements : mandat, flagrant délit, ordre du tribunal, cause probable, autre.", "Contrôle du mandat (actif, non expiré, même personne).", "Statuts : Enregistrée, En garde à vue, Libérée, Transférée, Inculpée."],
    forms=[("Nouvelle arrestation", "Personne ; affaire ; mandat ; agent arrêtant ; lieu ; fondement ; chefs d'accusation ; circonstances ; heure de lecture des droits ; notes.")],
    etapes=["Arrestations > Nouvelle arrestation.", "Ouvrir la garde à vue si nécessaire.", "Clore avec une issue."], resultats="Arrestation ARR-AAAA-NNNNN.",
    screens=[("enf-4-arrest-form.png", "Formulaire"), ("enf-5-arrest-detail.png", "Fiche")], confirm=["Voir circuit D bis."], gaps=[], wf="Dbis_arrestation_gav")

add(n=11, key="gardes_a_vue", title="Gestion des gardes à vue", dispo="D", url="/detention", perms=["detention"],
    objectif="Ouvrir, surveiller, prolonger et clore les gardes à vue avec le contrôle des délais.",
    fonctions=["Échéance légale à 48 h (constante à confirmer) ; prolongation de 48 h au plus ; signalement des dépassements.", "Journal de surveillance (bien-être, repas, médical, visite, avocat, transfert, incident, note).", "Issues : libéré sans charge, libéré sous caution, transféré au parquet, transféré à un poste, présenté au tribunal, médical, autre."],
    forms=[("Ouverture", "Arrestation ; cellule ; notes médicales."), ("Entrée de journal", "Type ; notes (3–2000 car.)."), ("Prolongation", "Autorité ; motif (10–2000 car.) ; nouvelle échéance."), ("Fin", "Issue ; notes.")],
    etapes=["Gardes à vue > Ouvrir.", "Journaliser les contrôles.", "Prolonger si autorisé.", "Clore."], resultats="Garde à vue DET-AAAA-NNNNN et arrestation mise à jour.",
    screens=[("enf-6-custody-detail.png", "Fiche de garde à vue"), ("enf-7-custody-extended.png", "Prolongation")], confirm=["Voir circuit D bis."], gaps=[], wf="Dbis_arrestation_gav")

add(n=12, key="enquetes", title="Gestion des enquêtes", dispo="P", url="/cases", perms=["cases", "investigations", "evidence", "persons"],
    objectif="Conduire l'instruction d'une affaire : équipe, personnes, tâches, notes, pièces à conviction, journal chronologique.",
    fonctions=["Affaires avec statuts et équipe (responsable, enquêteur, superviseur, analyste, appui).", "Personnes liées : plaignant, victime, témoin, suspect, etc., avec statut (actif, en enquête, mis hors de cause, inculpé, transmis, retiré).", "Tâches avec statuts ; pièces à conviction avec chaîne de conservation.", "Affaires sensibles à visibilité restreinte.", "Écran « Enquêtes » distinct : prévu, NON construit."],
    forms=[("Affaire", "Titre ; catégorie ; description (20–8000) ; date ; lieu ; commissariat ; département ; priorité ; sensible ; responsable."), ("Tâche", "Titre ; assigné ; échéance ; statut."), ("Pièce", "Catégorie ; description ; quantité ; scellé ; lieu de stockage.")],
    etapes=["Affaires > Nouvelle affaire (ou conversion d'une plainte).", "Ajouter équipe, personnes, tâches, pièces.", "Soumettre à examen."], resultats="Affaire CASE-AAAA-NNNNN suivie jusqu'à la clôture.",
    screens=[("theme-cases.png", "Affaires")], confirm=["Voir circuit A."], gaps=["Écran Enquêtes dédié et Opérations non construits."], wf="A_plainte")

add(n=13, key="proces_verbaux", title="Gestion des procès-verbaux", dispo="N", url="(prévu : /statements, /interviews)", perms=["statements", "interviews", "transcripts"],
    objectif="**Non construit** pour l'enquête : déclarations, auditions et transcriptions sont prévues (droits et modèle de données existent) mais leurs écrans n'existent pas. Le « PV » existant concerne les contraventions routières.",
    fonctions=["PV routier : voir module 7.", "Les constats d'enquête se consignent aujourd'hui en notes d'affaire."], forms=[], etapes=["—"],
    resultats="—", screens=[], confirm=["Forme réglementaire du procès-verbal d'enquête (modèle, signatures, visa)."], gaps=["Module à construire sur confirmation de la hiérarchie."])

add(n=14, key="transferts", title="Gestion des transferts de dossiers", dispo="P", url="/cases (affectation)", perms=["cases", "hr"],
    objectif="Affectation d'une affaire, transmission, transfert de garde des pièces, mutation d'agents. Pas de transfert inter-unités avec acceptation/refus.",
    fonctions=["Affectation d'une affaire à un membre du périmètre.", "Réaffectation signalée en cas de mutation d'un agent.", "Statut Transmise.", "Transfert de garde des pièces."],
    forms=[("Affecter à l'affaire", "Utilisateur ; rôle dans l'affaire.")], etapes=["Ouvrir l'affaire > Affecter."], resultats="Équipe d'affaire mise à jour, intéressé notifié.", screens=[],
    confirm=["Voir circuit F."], gaps=["Transfert formel entre unités non construit."], wf="F_transferts")

add(n=15, key="interventions", title="Gestion des interventions", dispo="P", url="/patrols", perms=["patrols", "incidents", "operations"],
    objectif="Planifier les patrouilles, enregistrer les incidents et les interventions. Le module Opérations est prévu mais non construit.",
    fonctions=["Patrouilles : planification (zone, poste, mission, superviseur, véhicule), démarrage avec kilométrage, clôture avec rapport, annulation motivée.", "Incidents : voir module 6.", "Statuts de patrouille : Planifiée, Active, Terminée, Annulée."],
    forms=[("Patrouille", "Zone ; équipe de poste (matin, etc.) ; mission (5–500 car.) ; superviseur ; véhicule ; agents ; notes."), ("Clôture de patrouille", "Kilométrage final ; rapport.")],
    etapes=["Patrouilles > Nouvelle patrouille.", "Démarrer.", "Terminer avec rapport."], resultats="Patrouille PTL-AAAA-NNNNN avec rapport.", screens=[], confirm=["Voir circuit C."], gaps=["Opérations (descentes, barrages, escortes) non construit."], wf="C_main_courante")

add(n=16, key="rapports", title="Gestion des rapports", dispo="P", url="/traffic/cash/reports", perms=["reports", "cash"],
    objectif="Les rapports de recettes (12 rapports) existent ; la page générale « Rapports » est prévue mais non construite.",
    fonctions=["12 rapports de recettes : journalier, hebdomadaire, mensuel, par agent, par unité, par commissariat, par province, par mode de paiement, etc. ; export CSV et PDF journalisé.", "Autres rapports (affaires, enquêtes, arrestations…) : non construits."],
    forms=[("Rapport de recettes", "Type de rapport ; période (début, fin) ; format.")], etapes=["Recettes > Rapports.", "Choisir la période.", "Afficher ou exporter."], resultats="Rapport avec totaux, sous le périmètre de l'utilisateur.", screens=[], confirm=["Rapports demandés par la hiérarchie à chaque niveau."], gaps=["Module général de rapports non construit."], wf="I_recettes")

add(n=17, key="statistiques", title="Gestion des statistiques", dispo="P", url="/dashboard", perms=["statistics", "dashboard", "traffic"],
    objectif="Chiffres du tableau de bord (agents, unités, incidents, affaires, plaintes, avis), statistiques de circulation et de recettes. La page « Statistiques » est prévue mais non construite.",
    fonctions=["Tableau de bord : période réglable, répartition des incidents par type, tendance.", "Tableau de bord circulation et recettes.", "Chaque chiffre est calculé dans le périmètre de l'utilisateur ; un chiffre sans droit n'est jamais montré."],
    forms=[], etapes=["Ouvrir Tableau de bord.", "Choisir la période."], resultats="Indicateurs en lecture seule.", screens=[("theme-dashboard.png", "Tableau de bord")], confirm=["Indicateurs attendus par niveau."], gaps=["Module de statistiques détaillées non construit."])

add(n=18, key="notifications", title="Gestion des notifications", dispo="D", url="/notifications", perms=["alerts"],
    objectif="Informer chaque utilisateur des tâches qui l'attendent : affectations, validations, alertes, sécurité.",
    fonctions=["Cloche et page Notifications avec types : Information, Affectation, Échéance, Approbation, Alerte, Sécurité.", "Lecture / marquage comme lu.", "Alertes nationales avec bandeau rouge."],
    forms=[], etapes=["Ouvrir la cloche.", "Cliquer la notification pour aller à l'élément."], resultats="Liste des notifications reçues.", screens=[], confirm=["Aucune notification par SMS ou courriel."], gaps=["Pas d'envoi hors application."])

add(n=19, key="archives", title="Gestion des archives", dispo="P", url="/cases (statut Archivée)", perms=["cases", "documents"],
    objectif="Une affaire clôturée peut être archivée (droit distinct). Le module Documents est prévu mais non construit.",
    fonctions=["Statut Archivée (lecture seule).", "Documents RH (module Ressources humaines).", "Droits documents (voir, confidentiel, déposer, archiver) existent sans écran."],
    forms=[], etapes=["Affaire clôturée > Archiver."], resultats="Affaire en lecture seule.", screens=[], confirm=["Durées de conservation et règles d'archivage."], gaps=["Module Documents/Archives non construit."])

add(n=20, key="tableaux_de_bord", title="Gestion des tableaux de bord", dispo="D", url="/dashboard", perms=["dashboard", "alerts", "traffic"],
    objectif="Présenter à chaque profil les chiffres de son périmètre : national, province, commissariat.",
    fonctions=["Cartes de chiffres : agents, unités, incidents, affaires ouvertes, plaintes de la période, avis actifs.", "Graphiques : incidents par type, tendance.", "Listes : incidents récents, avis récents.", "Filtre de province pour le national."],
    forms=[], etapes=["Ouvrir Tableau de bord."], resultats="Vue d'ensemble adaptée au profil.", screens=[("theme-dashboard.png", "Tableau de bord"), ("theme-phone-dashboard.png", "Sur téléphone")], confirm=[], gaps=[])
