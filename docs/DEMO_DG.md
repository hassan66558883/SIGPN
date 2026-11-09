# SIGPN-T v2.0 — Guide de démonstration pour la Direction générale

Police Nationale du Tchad · six scénarios, environ 30 minutes · **données entièrement fictives**

[[SOMMAIRE]]

## 1. Ce que la Direction va voir

Le système existant (plaintes, affaires, personnes, mandats, biométrie, circulation, ressources humaines) n'a pas été refait : il a été **modernisé** par couches, sans toucher à la base ni aux comptes existants. La démonstration montre les cinq nouveautés de la version 2.0, dans l'ordre où un avis de recherche vit réellement :

| # | Scénario | Durée | Ce que la Direction retient |
|---|---|---|---|
| 1 | Création et approbation d'un avis de recherche fictif à N'Djamena | 7 min | Trois personnes différentes doivent intervenir ; nul ne peut approuver son propre avis |
| 2 | Réception de l'alerte à Abéché et dans plusieurs unités | 5 min | L'alerte arrive à toutes les unités, chacune accuse réception, tout est tracé |
| 3 | Correspondance biométrique simulée | 5 min | Le bandeau rouge exige une vérification humaine ; une correspondance n'est jamais une preuve |
| 4 | Supervision nationale, unité hors ligne, reprise | 7 min | On voit qui a reçu, qui n'a pas reçu ; l'avis attend l'unité coupée et lui est remis à la reconnexion |
| 5 | Site public : plainte, suivi, avis publié | 6 min | Le citoyen dépose et suit sa demande ; seul un avis expressément validé devient public |

Chaque scénario ci-dessous donne : les comptes à utiliser, les gestes, ce que l'on dit, et ce qu'il ne faut **pas** promettre.

## 2. Préparation (10 minutes avant, une seule fois)

La démonstration tourne sur une **base dédiée**, jamais sur la base de développement ou de production. Les commandes ci-dessous sont à lancer depuis le dossier du projet.

```bash
# 1. Construire une base de démonstration neuve (migrations + données fictives) : elle porte obligatoirement un nom finissant par _demo
DEMO_DATABASE_URL="postgresql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:5436/pms_demo?schema=public" npm run demo:reset

# 2. Construire et lancer l'application contre cette base (port 3302)
NEXT_DIST_DIR=.next-demo npx next build
DATABASE_URL="postgresql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:5436/pms_demo?schema=public" APP_URL="http://localhost:3302" NEXT_DIST_DIR=.next-demo npx next start -p 3302

# 3. Activer le second facteur des comptes de direction (démonstration uniquement)
DATABASE_URL="postgresql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:5436/pms_demo?schema=public" npm run demo:mfa

# 4. Lire le code à six chiffres d'un compte au moment de se connecter
DATABASE_URL="postgresql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:5436/pms_demo?schema=public" npx tsx scripts/demo-totp.ts chief.abe
```

Le code change toutes les 30 secondes et ne sert qu'une fois : en cas de refus, attendre le code suivant.

**Dérouler les cinq scénarios automatiquement** (utile pour répéter, ou pour refaire les captures de ce guide) : `PMS_URL=http://localhost:3302 DATABASE_URL=…/pms_demo npm run demo:run`. Le script pilote un vrai navigateur, passe par l'interface et non par des raccourcis, et écrit les captures dans `docs/demo/screens/`. Il refuse de s'exécuter sur une base dont le nom ne finit pas par `_demo`.

### Comptes de démonstration

Tous les comptes partagent le mot de passe de démonstration (variable `DEMO_PASSWORD` du fichier `.env`). Les comptes marqués « 2FA » demandent le code à six chiffres.

| Compte | Fonction fictive | Unité | 2FA | Sert au scénario |
|---|---|---|---|---|
| `inv.diallo` | Enquêteur | Commissariat Central de N'Djamena | non | 1, 3 |
| `chief.cs1` | Commissaire de poste | Commissariat Central de N'Djamena | oui | 1, 5 |
| `commander.central` | Directeur provincial | Ville de N'Djamena | oui | 1 |
| `commander.national` | Commandant national | Direction générale | oui | 4 |
| `chief.abe` | Commissaire de poste | Commissariat Central d'Abéché | oui | 2, 4 |
| `chief.mdu` | Commissaire de poste | Commissariat Central de Moundou | oui | 2 |
| `chief.arr5`, `desk.post1` | Commissaire / agent d'accueil | 5e arrondissement ; poste du 1er | oui / non | 2 |

Le réseau de démonstration compte **14 unités**. Les cinq qui ont un compte se connectent ; les neuf autres restent « hors ligne », ce qui sert directement le scénario 4.

### Avant d'entrer dans la salle

- Navigateur en plein écran, résolution 1440 × 900 ou plus ; langue française (le bouton **AR** bascule en arabe, de droite à gauche).
- Une fenêtre privée par compte (ou un navigateur différent) : les sessions ne doivent pas se mélanger.
- Le bandeau orange « ENVIRONNEMENT DE DÉMONSTRATION — DONNÉES FICTIVES » reste visible sur toutes les pages : le laisser.

### L'écran de connexion

La page de connexion est réservée au personnel autorisé de la Police Nationale. Elle porte l'emblème officiel de la Direction Générale, en français, en arabe (de droite à gauche) et sur téléphone.

![Connexion en français](demo/screens/s0-1-connexion-fr.png)

![Connexion en arabe](demo/screens/s0-2-connexion-ar-rtl.png)

![Connexion sur téléphone](demo/screens/s0-3-connexion-mobile.png)

## 3. Scénario 1 — Créer et approuver un avis de recherche fictif à N'Djamena

**Message :** *« Un avis de recherche ne peut pas être publié par une seule personne. Il faut un enquêteur, un vérificateur et une autorité qui approuve. »*

**Comptes :** `inv.diallo` → `commander.central` → `chief.cs1` → `commander.central`.

1. **L'enquêteur crée l'avis** (menu *Personnes recherchées* → *Nouvel avis*). Il choisit une personne fictive du registre, saisit l'infraction, la nature (mandat de recherche), le périmètre de diffusion (**nationale**), la priorité, l'autorité émettrice, la base juridique et le motif. Le motif reste interne : il n'est jamais publié.

   ![Formulaire de création par l'enquêteur](demo/screens/s1-1-formulaire-enqueteur.png)

2. L'avis est enregistré **en brouillon**. Il n'est pas encore diffusé.

   ![Avis enregistré en brouillon](demo/screens/s1-2-brouillon-cree.png)

3. Comme il s'agit d'un mandat de recherche, l'enquêteur **demande le mandat** (autorité, référence, motifs). Le système interdit de vérifier ou d'approuver un tel avis sans mandat lié.

   ![Demande de mandat](demo/screens/s1-3-demande-de-mandat.png)

4. Le **directeur provincial active le mandat** (compte différent de l'émetteur).

   ![Activation du mandat](demo/screens/s1-4-activation-mandat.png)

5. Le **commissaire de poste vérifie** les pièces et la base juridique. Le système refuse que l'émetteur vérifie son propre avis (règle des quatre yeux).

   ![Vérification par le commissaire](demo/screens/s1-5-verification-chef.png)

6. L'**autorité approuve** : l'avis passe à l'état *Actif*. Dans la même opération, le système crée **un événement national unique** et une livraison pour chaque unité destinataire.

   ![Approbation par le commandement](demo/screens/s1-6-approbation-commandement.png)

   ![Avis actif et diffusé](demo/screens/s1-7-avis-actif-diffuse.png)

**À ne pas promettre :** la photographie de la personne n'est pas diffusée dans le bulletin d'alerte (décision à prendre avec la Direction, voir *Limites*). Les personnes et les mandats sont fictifs.

## 4. Scénario 2 — L'alerte arrive à Abéché et dans plusieurs unités

**Message :** *« Dès l'approbation, toutes les unités concernées reçoivent le même avis, au même moment, et chacune doit accuser réception. »*

**Comptes :** `chief.abe` (Abéché), puis `chief.mdu` (Moundou).

1. Le commissaire d'Abéché ouvre **Alertes nationales**. Le bandeau rouge « alerte nationale à traiter » est visible sur toutes ses pages ; un signal sonore bref peut être activé par poste. La liste montre l'avis, sa priorité, son état *Reçue*, et le rappel « vérification humaine obligatoire ».

   ![Liste des alertes à Abéché](demo/screens/s2-1-abeche-liste-alertes.png)

2. Il ouvre l'alerte : le **contenu transmis est volontairement minimal** (personne, infraction, autorité, unité émettrice). Les pièces du dossier restent dans leur périmètre d'accès.

   ![Alerte reçue à Abéché](demo/screens/s2-2-abeche-alerte-recue.png)

3. Il **acquitte** : l'accusé est horodaté et attribué à l'unité, et il figure dans l'audit.

   ![Alerte acquittée](demo/screens/s2-3-abeche-acquittee.png)

4. Même alerte, vue depuis Moundou.

   ![Alerte vue à Moundou](demo/screens/s2-4-moundou-alerte.png)

5. Même alerte à Abéché, **en arabe**, interface de droite à gauche.

   ![Alerte à Abéché en arabe](demo/screens/s2-5-abeche-alerte-arabe-rtl.png)

**À ne pas promettre :** l'alerte arrive à la **prochaine synchronisation du poste, environ 20 secondes** ; ce n'est pas une notification instantanée ni une notification sur téléphone. Le texte du bulletin (par exemple la mention « vérification humaine obligatoire ») est figé en français au moment de la publication, car l'avis est immuable ; il reste en français dans l'interface arabe.

## 5. Scénario 3 — Correspondance biométrique simulée

**Message :** *« Le système signale ; c'est l'agent qui décide. Aucune mesure de contrainte ne repose sur une machine. »*

**Compte :** `inv.diallo` (droit de contrôle biométrique).

1. L'écran *Contrôle biométrique* affiche en permanence le bandeau **SIMULATION** : aucune empreinte ni image réelle n'est comparée ni enregistrée. Le scénario de démonstration se choisit dans la liste (*Correspondance possible*, *Incertain*, *Aucune correspondance*, *Indisponible*).

   ![Console de contrôle en simulation](demo/screens/s3-1-console-simulation.png)

2. L'agent lance la vérification (motif obligatoire). Le résultat **« Correspondance possible — vérification humaine obligatoire »** apparaît dans un encadré rouge, accompagné d'un signal sonore bref réglable. L'écran donne l'indice de similarité, la qualité de capture, la **référence de l'alerte du réseau** et la personne telle qu'elle figure dans l'avis.

   ![Alerte rouge de correspondance](demo/screens/s3-2-alerte-rouge-correspondance.png)

3. Les boutons proposent : voir le dossier autorisé, **demander vérification**, **notifier le supérieur**, **signaler une erreur** (faux positif). Chaque action est tracée.

   ![Détail et confirmation humaine](demo/screens/s3-3-detail-et-confirmation-humaine.png)

**À ne pas promettre :** il s'agit d'une **simulation**. Le branchement d'un lecteur d'empreintes ou d'un système de reconnaissance faciale réel exige une base légale, un système homologué, des tests de précision et une analyse d'impact ; les seuils affichés sont des valeurs de démonstration.

## 6. Scénario 4 — Supervision nationale, unité hors ligne, reprise

**Message :** *« La Direction voit en un écran qui a reçu l'avis, qui l'a lu, qui l'a acquitté, et qui est coupé. Rien n'est perdu : l'avis attend l'unité hors ligne. »*

**Compte :** `commander.national`.

1. La **supervision nationale** donne les chiffres de la période, la liste des alertes diffusées (reçues, lues, acquittées, échecs, en attente) et le détail par province et par unité avec l'état de connexion.

   ![Supervision nationale](demo/screens/s4-1-supervision-nationale.png)

2. Le commandant **coupe l'unité d'Abéché** (bouton *Couper l'unité*, réservé à la démonstration) puis lance un **exercice national** (formulaire de simulation, marqué comme tel). Les unités connectées reçoivent l'exercice (formulaire en bas de la page de supervision) ; **Abéché reste « En attente »** : l'avis est conservé dans la file durable en base.

   ![Unité hors ligne, avis retenu](demo/screens/s4-2-unite-hors-ligne-avis-retenu.png)

3. Le commandant **rétablit l'unité**. À sa synchronisation suivante, Abéché reçoit tout ce qu'elle a manqué, dans l'ordre, une seule fois.

   ![Reprise après reconnexion](demo/screens/s4-3-reprise-apres-reconnexion.png)

   ![Supervision après reprise](demo/screens/s4-4-supervision-apres-reprise.png)

4. Si une unité reste muette, le système **relance** puis **escalade** au supérieur hiérarchique (passes automatiques toutes les minutes ; le bouton *Relancer les unités* force une passe).

**À ne pas promettre :** la coupure est **simulée** dans l'application ; le comportement avec une vraie coupure de liaison (câble, VSAT) n'a pas été éprouvé sur le terrain. Les mesures de charge ont été faites sur un seul poste (300 unités simulées, 20 avis) : les délais réels du réseau ne sont pas mesurés.

## 7. Scénario 5 — Le site public : plainte, suivi, publication d'un avis

**Message :** *« Le citoyen dépose et suit sa demande sans compte. Le site ne montre que ce qu'une autorité a expressément décidé de publier. »*

**Comptes :** aucun (citoyen), puis `chief.cs1`.

1. **Accueil du portail public**, accessible sans connexion, avec le bandeau de démonstration et l'accès « Espace agents ».

   ![Accueil du portail public](demo/screens/s5-1-accueil-public.png)

2. Le citoyen **dépose une plainte** : nature des faits, objet, description, lieu, unité, coordonnées facultatives, consentement obligatoire. Aucune pièce jointe n'est acceptée.

   ![Formulaire de plainte](demo/screens/s5-2-formulaire-plainte.png)

3. Il reçoit une **référence** et un **code de suivi**, affichés une seule fois (le code est conservé sous forme d'empreinte, personne ne peut le retrouver).

   ![Plainte enregistrée](demo/screens/s5-3-plainte-recue.png)

4. Il **suit sa demande** avec la référence et le code : état *Reçue*.

   ![Suivi : reçue](demo/screens/s5-4-suivi-recu.png)

5. Côté agent, le commissaire voit le **dépôt** dans l'espace *Site public* de son unité, l'ouvre, change l'état et rédige la réponse publique.

   ![File des dépôts](demo/screens/s5-5-bureau-public-file.png)

   ![Traitement du dépôt](demo/screens/s5-6-traitement-plainte.png)

6. Le citoyen consulte à nouveau : état *En cours d'examen* et **réponse de la Police Nationale**.

   ![Suivi : réponse](demo/screens/s5-7-suivi-reponse.png)

7. **Publier un avis de recherche** : sur la fiche d'un avis actif et vérifié, le commissaire rédige le texte public, **coche la validation expresse** et publie. Seuls le nom, les alias, l'âge approximatif, le signalement, le motif et ce texte sont publiés ; le retrait est automatique dès que l'avis cesse d'être actif.

   ![Publication expresse](demo/screens/s5-8-publication-expresse.png)

   ![Avis publié sur le site public](demo/screens/s5-9-avis-public-publie.png)

8. Le même portail **en arabe** (de droite à gauche) et **sur téléphone**.

   ![Portail en arabe](demo/screens/s5-10-portail-arabe-rtl.png)

   ![Portail sur téléphone](demo/screens/s5-11-portail-mobile.png)

**À ne pas promettre :** pas d'e-mail ni de SMS de confirmation (le citoyen suit par référence et code) ; pas de CAPTCHA (des plafonds, un champ piège et la validation côté serveur protègent les dépôts) ; pas de photographie sur le site public. L'annuaire et les actualités de la démonstration sont fictifs et ne contiennent aucun numéro officiel.

## 8. Scénario 6 — Mandat, arrestation, garde à vue : la chaîne complète

**Message :** *« Chaque étape a un responsable distinct et une trace. Personne ne valide sa propre demande, et le délai légal de la garde à vue est surveillé. »*

**Comptes :** `inv.diallo` (enquêteur), `chief.cs1` (commissaire, second facteur), `custody.cs1` (agent de garde). Rejouable automatiquement : `. scripts/demo/env.sh && npx tsx scripts/demo/enforcement.ts` (base de démonstration uniquement).

1. L'enquêteur **demande un mandat** : type, personne, autorité émettrice, motifs, date d'expiration. Il est créé en **brouillon**.

   ![Demande de mandat](demo/screens/enf-1-warrant-form.png)

2. L'enquêteur voit que **quelqu'un d'autre doit l'approuver** : aucun bouton de validation ne lui est proposé (la règle est aussi tenue par le serveur).

   ![Mandat en brouillon](demo/screens/enf-2-warrant-draft.png)

3. Le commissaire **approuve** (avec son second facteur) : le mandat devient *Actif*, l'approbateur et l'heure sont consignés.

   ![Mandat actif](demo/screens/enf-3-warrant-active.png)

4. L'enquêteur **enregistre l'arrestation sur ce mandat**. Le système vérifie que le mandat est actif, non expiré et vise bien cette personne ; l'heure ne peut pas être dans le futur.

   ![Formulaire d'arrestation](demo/screens/enf-4-arrest-form.png)

   ![Arrestation enregistrée](demo/screens/enf-5-arrest-detail.png)

5. L'agent de garde **place la personne en garde à vue** et tient le journal de surveillance. L'échéance légale (48 h) court **depuis l'arrestation**, pas depuis la saisie.

   ![Garde à vue](demo/screens/enf-6-custody-detail.png)

6. Seul le commissaire peut **prolonger** (autorité qui autorise et motif obligatoires, au plus 48 h au-delà de la limite). L'agent de garde ne voit pas ce formulaire.

   ![Prolongation](demo/screens/enf-7-custody-extended.png)

7. À la **fin de la garde à vue**, l'arrestation suit l'issue choisie (libération, déféré au parquet, transfert). Le mandat est ensuite marqué **exécuté**.

   ![Mandat exécuté](demo/screens/enf-8-warrant-executed.png)

**À dire :** la liste des gardes à vue signale celles dont le délai est dépassé ; toutes les étapes figurent au journal d'audit.

## 9. Questions probables de la Direction

| Question | Réponse honnête |
|---|---|
| Le système remplace-t-il l'existant ? | Non. Même base, mêmes comptes, mêmes modules ; trois migrations **additives**, sans suppression ni réécriture de données. Le retour arrière de chacune est écrit en tête du fichier. |
| Qui peut publier un avis ? | Personne seul : l'émetteur ne peut ni vérifier ni approuver son avis, et la publication sur le site public est une étape distincte avec validation expresse. |
| Et si une unité n'a pas internet ? | L'avis reste en file durable en base ; il lui est remis à la reconnexion, dans l'ordre, une seule fois. Au-delà d'un délai, relance puis escalade. |
| La biométrie est-elle réelle ? | Non, simulée et annoncée comme telle. L'écran, les règles de décision humaine et la traçabilité sont prêts ; le matériel et la base légale restent à fournir. |
| Est-ce sûr ? | Chaque route est testée sans droit, avec un mauvais droit et avec le bon droit ; injections, données hostiles, reprise après coupure, doubles passes de maintenance : voir le rapport de tests. Aucun audit externe n'a été fait. |
| Combien d'unités supporte-t-il ? | Mesuré : 300 unités simulées et 20 avis, diffusion en 138 ms au 95e centile, supervision nationale en 27 ms, sur un seul poste. À confirmer sur le réseau réel. |
| Quand peut-on le mettre en service ? | Voir le plan de déploiement du dossier de livraison : sauvegarde testée, reverse proxy, secrets, formation, période de double commande. |
| Les données de la démonstration sont-elles réelles ? | Non. Personnes, mandats, plaintes, adresses et textes sont fictifs. |

## 10. Si quelque chose se passe mal pendant la démonstration

- **Code à six chiffres refusé :** attendre le code suivant (un code ne sert qu'une fois).
- **L'alerte n'apparaît pas à Abéché :** attendre 20 secondes (synchronisation) ou recharger la page ; vérifier dans la supervision que l'unité est « Connectée ».
- **Page lente à la première ouverture :** elle se met en cache ; c'est normal avec une base neuve.
- **Tout recommencer :** arrêter l'application, relancer `npm run demo:reset`, puis les commandes de la section 2 (5 minutes).
