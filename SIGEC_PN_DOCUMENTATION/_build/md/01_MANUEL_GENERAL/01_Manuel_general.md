# Manuel général du SIGEC-PN / SIGPN-T

**Prise en main pour tous les utilisateurs de la Police nationale**

| Rubrique | Valeur |
|---|---|
| Système | SIGEC-PN / SIGPN-T — Système d'information de gestion de la Police nationale du Tchad |
| Éditeur et développeur | TECHNOTCHAD |
| Version du document | 1.0 — 10 novembre 2026 |
| Statut | Projet pour validation par la hiérarchie : les points marqués « À confirmer » ne sont pas des décisions |
| Source des informations | Lecture seule du système existant (code, catalogue des rôles et droits, écrans) — aucune donnée, aucun compte, aucun rôle, aucune permission n'a été modifié |

## 1. À quoi sert le système

Le SIGPN-T est le système d'information de la Police nationale du Tchad. Il permet d'enregistrer et de suivre : les plaintes et les affaires, les personnes, les mandats et les avis de recherche, les arrestations et gardes à vue, les incidents et patrouilles, les pièces à conviction, la circulation routière (contrôles, procès-verbaux, amendes, recettes), les ressources humaines et l'administration des comptes. Il est en **français et en arabe** (lecture de droite à gauche) et s'utilise sur ordinateur et sur téléphone.

## 2. Les principes à retenir

- **Chacun voit ce que son rôle et son affectation permettent** : un commissariat ne voit que ses dossiers, un délégué provincial que sa province.
- **Rien n'est effacé** : tout est historisé ; les corrections se font par statut (annulé, rejeté, clos).
- **Deux personnes pour les actes graves** : celui qui demande ne valide pas (mandat, avis de recherche, comptes, paie).
- **Une alerte ou une correspondance n'est jamais une preuve** : l'humain vérifie avant d'agir.
- **Votre compte est personnel** : tout est enregistré à votre nom.

### Se connecter

1. Ouvrir l'adresse du système dans le navigateur (l'adresse vous est communiquée par votre administration).
2. Saisir votre **identifiant** et votre **mot de passe**, puis cliquer sur **Se connecter**.
3. Si votre profil exige un **second facteur**, saisir le code à 6 chiffres de l'application d'authentification de votre téléphone. Le code change toutes les 30 secondes et ne sert qu'une seule fois : si le code est refusé, attendre le suivant.
4. À la première connexion (ou après une réinitialisation), le système demande de **choisir un nouveau mot de passe** : au moins 12 caractères, avec au moins trois types parmi minuscules, majuscules, chiffres et symboles ; il ne doit contenir ni votre identifiant ni votre nom de courriel, ni être un mot de passe courant.
5. Après **5 échecs** de connexion, le compte est verrouillé 15 minutes. Mot de passe oublié : utiliser le lien de la page de connexion ; votre demande est transmise à l'administrateur de sécurité qui vous remet un lien à usage unique valable 60 minutes.

> Ne communiquez jamais votre mot de passe ni votre code : tout ce qui est fait avec votre compte est enregistré à votre nom.

## 3. Découvrir l'écran

- **Menu de gauche** : les modules autorisés (sur téléphone : bouton de navigation).
- **En-tête** : sélecteur de langue (français / arabe), notifications (cloche), **Mon compte** (votre nom, votre fonction et votre unité) et le bouton **Déconnexion**.
- **Tableau de bord** : les chiffres de votre périmètre.
- **Listes** : filtres, recherche, tri ; un clic ouvre la fiche.
- **Boutons** : les actions disponibles pour votre profil ; un bouton absent signifie un droit manquant.

![Page de connexion](../07_ANNEXES/captures/s0-1-connexion-fr.png)

![Tableau de bord](../07_ANNEXES/captures/theme-dashboard.png)

![Sur téléphone](../07_ANNEXES/captures/theme-phone-dashboard.png)

![En arabe](../07_ANNEXES/captures/s0-2-connexion-ar-rtl.png)

## 4. Les notifications

La cloche signale : affectations, décisions à prendre, échéances, alertes, sécurité. Les alertes nationales (avis de recherche) s'affichent en **bandeau rouge** sur toutes les pages. Les notifications ne sont pas envoyées par SMS ni par courriel.

## 5. Exporter en PDF (chefs de commandement)

Les **listes** (Plaintes, Affaires, Mandats, Arrestations, Garde à vue, Incidents) et les **fiches** de ces dossiers peuvent être exportées en PDF par le bouton **Exporter en PDF**. **Ce droit est réservé aux chefs de chaque niveau de commandement** (commandement national, délégué provincial, commandant de département, commissaire) : l'agent d'accueil, l'enquêteur, l'administrateur technique, l'auditeur ou l'administrateur de la police ne le voient pas. Le PDF respecte le périmètre et la confidentialité de l'écran, est limité à 500 lignes, porte le nom de l'exportateur et la date, et **chaque export est journalisé**. (Recommandation de l'éditeur, à confirmer par la Direction.)

## 5 bis. Les statuts

Chaque dossier a un statut visible (par exemple pour une plainte : Brouillon, Enregistrée, En examen, Affectée, Convertie, Clôturée, Rejetée). Les statuts « définitifs » ne se modifient plus. Voir les circuits (dossier 04).

## 6. Quel manuel lire ?

| Je suis… | Manuel |
|---|---|
| Directeur général | 02_MANUELS_PAR_PROFIL/01_Manuel_du_Directeur_general |
| directeurs centraux | 02_MANUELS_PAR_PROFIL/02_Manuel_des_Directeurs_centraux |
| délégués provinciaux de police | 02_MANUELS_PAR_PROFIL/03_Manuel_des_Delegues_provinciaux |
| commissaires (chefs de commissariat) | 02_MANUELS_PAR_PROFIL/04_Manuel_des_Commissaires |
| chefs de service | 02_MANUELS_PAR_PROFIL/05_Manuel_des_Chefs_de_service |
| officiers de police judiciaire (OPJ) | 02_MANUELS_PAR_PROFIL/06_Manuel_des_OPJ |
| enquêteurs | 02_MANUELS_PAR_PROFIL/07_Manuel_des_Enqueteurs |
| agents de police | 02_MANUELS_PAR_PROFIL/08_Manuel_des_Agents |
| de l'administrateur technique | 02_MANUELS_PAR_PROFIL/09_Manuel_de_l_Administrateur_technique |

## 7. Ce que le système ne fait pas (état actuel)

- Main courante dédiée, procès-verbaux d'audition/déclaration, enquêtes en écran dédié, opérations, documents/archives, rapports et statistiques généraux, recherche globale : prévus mais **non construits**.
- Transfert de dossier entre commissariats avec acceptation ou refus motivé.
- Échange électronique avec les juridictions.
- Envoi de SMS ou de courriels.
- Paiement en ligne réel d'amendes : la simulation fonctionne, Airtel est écrit mais non essayé en réel, Moov n'est pas construit.

### Se déconnecter en sécurité

1. Cliquer sur le bouton **Déconnexion** en haut à droite de l'en-tête.
2. Ne pas se contenter de fermer l'onglet, surtout sur un poste partagé.
3. La session se ferme d'elle-même après **60 minutes d'inactivité** (15 minutes pour les comptes qui détiennent un droit sensible) et au plus tard après **10 heures**.

