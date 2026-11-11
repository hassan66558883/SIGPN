# Manuel des directeurs centraux

**Manuel d'utilisation, pas à pas, à partir de ce que le système permet réellement**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## À qui s'adresse ce manuel

Directeurs des directions centrales (DSP, DLGDEAM, DPTSCI, DIE, DRHM, DITT, DLS, DSPSM, DBCN-IP, DENP, GMIP, GSR, USIP, UNILT).

## Responsabilités

- Superviser les services de leur direction (la structure détaillée est fixée par arrêté ministériel — hors système).

> **Le système n'a pas de rôle « directeur central ».** Les 14 directions centrales et unités du décret 0572/2023 existent comme unités de l'organisation, mais le compte d'un directeur central porte l'un des rôles à portée nationale existants (voir ci-dessous). Le choix du rôle de chaque directeur est une décision de la Direction ; ce manuel décrit ce que chaque rôle national permet, sans présumer de l'attribution.

### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

### Présentation du tableau de bord

Après connexion, le **Tableau de bord** résume les chiffres de votre périmètre. Le menu de gauche (ou le bouton de navigation sur téléphone) donne accès aux modules autorisés. Les modules que vous ne voyez pas ne sont pas accessibles à votre profil. Le système est disponible en **français et en arabe** (sélecteur de langue dans l'en-tête).

## Rôles à portée nationale (ce que chacun permet)

| Fonction | Code | Droits | Menu | Rôle |
|---|---|---|---|---|
| Administrateur technique | `SUPER_ADMIN` | 12 | 7 modules au menu | Administre la plate-forme technique (paramètres, sauvegardes, structure organisationnelle, catalogue des rôles). Ne détient AUCUN droit sur les données de police. |
| Administrateur de sécurité | `SECURITY_ADMIN` | 16 | 10 modules au menu | Gère les comptes, les sessions et les paramètres de sécurité, lit le journal d'audit. Ne détient aucune autorité opérationnelle de police. |
| Commandement national (Direction générale) | `NATIONAL_COMMANDER` | 85 | 42 modules au menu | Supervision nationale : lit l'ensemble des données, approuve les mandats, avis de recherche, opérations et rapports, décide des approbations sensibles. |
| Analyste criminel | `ANALYST` | 40 | 28 modules au menu | Analyse nationale en lecture seule et production de rapports. |
| Auditeur | `AUDITOR` | 40 | 31 modules au menu | Accès en lecture seule à tous les enregistrements et au journal d'audit. |
| Administrateur de la police (système d'information) | `POLICE_ADMIN` | 90 | 51 modules au menu | Administration nationale du système d'information de la police : utilisateurs, organisation et toutes les fonctions de circulation, avec des droits de commandement. |
| Directeur des ressources humaines | `HR_DIRECTOR` | 22 | 16 modules au menu | Direction des ressources humaines : dossiers RH et décisions de carrière (promotion, nomination, statut, retraite). |
| Gestionnaire de paie | `HR_PAYROLL` | 7 | 14 modules au menu | Paie : demande les modifications de barème et d'éléments de paie et génère les états mensuels ; ne peut ni valider ni exporter. |
| Contrôleur de paie | `HR_PAYROLL_CONTROL` | 8 | 14 modules au menu | Contrôle de la paie : valide barèmes, éléments et états mensuels, les exporte vers les services financiers ; ne peut pas créer ce qu'il valide. |
| Agent du service des ressources humaines | `HR_OFFICER` | 15 | 13 modules au menu | Service des ressources humaines : tient les dossiers RH ; ne peut pas enregistrer de décision de carrière. |

Pour la fiche détaillée de chaque rôle, voir les fiches du dossier `FICHES_TOUS_LES_ROLES`.

## Fonctions que le système ne propose pas (encore)

Pour éviter toute confusion, voici ce que vous ne trouverez **pas** dans les menus, même si vous en avez l'habitude dans le travail : un registre de **main courante** distinct (le module Incidents s'en rapproche), les **procès-verbaux d'audition et déclarations**, un écran **Enquêtes** dédié, un transfert de **dossier entre commissariats** avec acceptation ou refus, les **rapports** et **statistiques** généraux (seuls le tableau de bord et les rapports de recettes existent), les **archives/documents**, la recherche globale, l'envoi de SMS ou de courriels.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

## Points à confirmer auprès de la hiérarchie

- Quel rôle attribuer à chaque directeur central (ex. Directeur des ressources humaines = rôle RH).
- Faut-il créer des rôles propres à chaque direction centrale (droits à définir avec la Direction).

## Améliorations recommandées

- Rapports périodiques automatiques vers le niveau supérieur (module Rapports non construit).
- Alerte de relance pour les dossiers sans suite (non construite).

