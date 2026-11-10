# -*- coding: utf-8 -*-
import shutil
from lib import *
import mdout

LIV = [
    (1, "Manuel général du SIGEC-PN / SIGPN-T", "01_MANUEL_GENERAL/01_Manuel_general"),
    (2, "Manuel du Directeur général", "02_MANUELS_PAR_PROFIL/01_Manuel_du_Directeur_general"),
    (3, "Manuel des directeurs centraux", "02_MANUELS_PAR_PROFIL/02_Manuel_des_Directeurs_centraux"),
    (4, "Manuel des délégués provinciaux", "02_MANUELS_PAR_PROFIL/03_Manuel_des_Delegues_provinciaux"),
    (5, "Manuel des commissaires", "02_MANUELS_PAR_PROFIL/04_Manuel_des_Commissaires"),
    (6, "Manuel des chefs de service", "02_MANUELS_PAR_PROFIL/05_Manuel_des_Chefs_de_service"),
    (7, "Manuel des OPJ", "02_MANUELS_PAR_PROFIL/06_Manuel_des_OPJ"),
    (8, "Manuel des enquêteurs", "02_MANUELS_PAR_PROFIL/07_Manuel_des_Enqueteurs"),
    (9, "Manuel des agents", "02_MANUELS_PAR_PROFIL/08_Manuel_des_Agents"),
    (10, "Manuel de l'administrateur technique", "02_MANUELS_PAR_PROFIL/09_Manuel_de_l_Administrateur_technique"),
    (11, "Matrice complète des comptes et permissions", "05_MATRICE_ROLES_PERMISSIONS/01_Matrice_comptes_et_permissions (+ .xlsx, .csv)"),
    (12, "Cartographie organisationnelle des responsabilités", "05_MATRICE_ROLES_PERMISSIONS/03_Cartographie_organisationnelle (+ Matrice RACI : 02_Matrice_RACI)"),
    (13, "Manuel de gestion des plaintes", "03_MANUELS_PAR_MODULE/04_plaintes"),
    (14, "Manuel de gestion des mandats d'arrêt", "03_MANUELS_PAR_MODULE/08_mandats"),
    (15, "Manuel de gestion des mains courantes", "03_MANUELS_PAR_MODULE/06_mains_courantes (module inexistant : voir le document)"),
    (16, "Manuel de gestion des infractions", "03_MANUELS_PAR_MODULE/07_infractions"),
    (17, "Manuel de gestion des personnes recherchées", "03_MANUELS_PAR_MODULE/09_recherches"),
    (18, "Manuel des arrestations et gardes à vue", "03_MANUELS_PAR_MODULE/10_Arrestations_et_gardes_a_vue"),
    (19, "Manuel des transferts de dossiers", "03_MANUELS_PAR_MODULE/14_transferts (procédure formelle inexistante : voir le document)"),
    (20, "Manuel des validations", "03_MANUELS_PAR_MODULE/21_Manuel_des_validations"),
    (21, "Catalogue des notifications", "07_ANNEXES/01_Catalogue_des_notifications"),
    (22, "Diagrammes des workflows", "04_WORKFLOWS/00_Diagrammes_des_workflows, 00_Diagrammes_Mermaid, mermaid/*.mmd, img/*.png"),
    (23, "Guide de formation des utilisateurs", "06_GUIDE_FORMATION/01_Guide_de_formation"),
    (24, "Glossaire professionnel", "07_ANNEXES/02_Glossaire"),
]

def main():
    s = "# SIGEC-PN / SIGPN-T — Documentation complète\n\n**Éditeur et développeur : TECHNOTCHAD** — version 1.0 — " + DATE + "\n\n"
    s += "Cette documentation a été produite par lecture seule du système existant. **Rien n'a été inventé** : ce que le système ne fait pas est écrit comme tel, et ce qui dépend de la hiérarchie est marqué « À confirmer ». Chaque document existe en **Word (.docx)** et en **PDF**.\n\n"
    s += "## Les 24 livrables demandés\n\n" + table(["N°", "Livrable", "Emplacement (sans extension)"], LIV) + "\n"
    s += "## Contenu du dossier\n\n" + table(["Dossier", "Contenu"], [
        ("01_MANUEL_GENERAL", "Audit et inventaire, manuel général, sécurité et contrôle"),
        ("02_MANUELS_PAR_PROFIL", "9 manuels par profil + `FICHES_TOUS_LES_ROLES` (un manuel pour chacun des 29 rôles du système)"),
        ("03_MANUELS_PAR_MODULE", "Un manuel par module (les 20 modules demandés ; 10 et 11 réunis) + manuel des validations"),
        ("04_WORKFLOWS", "11 circuits détaillés (A à J + D bis), diagrammes (PNG), sources Mermaid"),
        ("05_MATRICE_ROLES_PERMISSIONS", "Matrice rôles × droits (PDF, Word, Excel, CSV), matrice RACI, cartographie organisationnelle"),
        ("06_GUIDE_FORMATION", "Guide de formation, 10 travaux pratiques, QCM, grille d'évaluation, les 10 règles d'or"),
        ("07_ANNEXES", "Glossaire, catalogue des notifications, points à confirmer et améliorations, index et fichiers des captures réelles"),
        ("_build", "Sources Markdown et catalogue extrait du système (pour régénérer : `python scripts/docgen/build.py`)")]) + "\n"
    s += "## Les constats les plus importants\n\n" + bullets([
        "**Pas de module « main courante »** : le module Incidents s'en rapproche (décision à prendre).",
        "**Pas de transfert formel de dossier** entre commissariats avec acceptation ou refus motivé : seules l'affectation, la transmission et la mutation d'agents existent.",
        "**Pas de rôle « chef de service », « commissaire adjoint » ni « directeur central »** : les directeurs centraux portent un rôle national choisi par la Direction.",
        "**Le profil « OPJ » n'a pas de pouvoir judiciaire propre** dans le système (ni plainte, ni arrestation, ni mandat).",
        "**Non construits** : procès-verbaux d'audition, enquêtes (écran), opérations, documents/archives, rapports et statistiques généraux, recherche globale.",
        "**L'administrateur technique n'a aucun pouvoir opérationnel ou judiciaire.**",
        "**Second facteur suspendu** sur l'installation de démonstration : à rétablir avant mise en service."]) + "\n"
    p = ROOT / "00_LISEZ_MOI.md"
    p.write_text(s, encoding="utf-8")
    mdout.to_pdf(p, p.with_suffix(".pdf")); mdout.to_docx(p, p.with_suffix(".docx"))
    dst = ROOT / "_build" / "md"; dst.mkdir(parents=True, exist_ok=True)
    shutil.move(str(p), str(dst / "00_LISEZ_MOI.md"))

main()
