# Rapport complet - Analyse PostgreSQL grh_msp et modeles en etoile PFE

Date: 2026-04-08
Auteur: Synthese Copilot
Contexte: Analyse de la base PostgreSQL grh_msp avec focus tables vides, donnees NULL, themes PFE, KPIs, et modeles en etoile.

## 1) Objectif de la demande

Ce document regroupe tout le travail realise:
- Audit de qualite des donnees (tables vides + taux de NULL)
- Snapshot KPI sur les tables RH exploitables
- Proposition des themes PFE utilisables selon la donnee disponible
- Conception des modeles en etoile par theme

## 2) Elements retenus de la proposition PFE

Axes metiers identifies dans la proposition:
- Centralisation RH nationale
- Pilotage decisionnel via tableaux de bord
- Suivi d indicateurs RH: effectifs, repartition regionale, mobilite, absent/retard
- Pipeline data (collecte, nettoyage, integration, agregation)

## 3) Methode d analyse

- Connexion en lecture seule a PostgreSQL grh_msp
- Profilage structure + volumetrie des tables public
- Comptage exact COUNT(*) pour chaque table
- Profilage NULL par colonne nullable
- Focus metier sur tables RH, conges, pointage, mobilite, recrutement

## 4) Resultats audit qualite et volumetrie

### 4.1 Chiffres globaux

- Nombre total de tables public: 114
- Nombre de tables vides: 30
- Taux de tables vides: 26.32%

### 4.2 Tables metier majeures (row_count)

- PERSONNEL: 91,651
- CONTRAT: 91,651
- FAMILLE: 160,718
- DEM_CNG: 674,902
- JUSTIF_DEM_CNG: 120,923
- POINTER: 13,484,398
- CAL_PERS: 10,212,279
- RETARD_JOURNEE: 337,296
- MOUVEMENT_PERS: 91,651
- CONCOURS: 37
- FICHE_CANDIDAT: 6,000
- DET_FICHE_CANDIDAT: 6,000
- STAGE: 5,000
- FICHE_EVAL_RECRU: 3,043
- DET_FICHE_EVAL_RECRU: 9,129

### 4.3 Liste des 30 tables vides

ATTEST_TRAV, AUTORISATION_SORT, CAND_DIPLOM, CARTE_POINT, COMPETENCE_CANDIDAT, CONSEIL_ADMINISTRATION, DETAIL_CONTRAT, DET_EVAL_STAGE, DET_LINE_AVIS, DIPLOME_AVIS, DIPLOME_DIR, DIVERS_AVIS, DIVERS_CAND, DIVERS_DIR, DOCUMENT_AVIS, DOC_CAND, EXPERIENCE_CAND, FAMILLE_CANDIDAT, FICHE_EVAL_STAGE, FORM_AVIS, FORM_CAND, INTERIM_CNG, LIGNE_DIR, PERSONNEL_RECRUT, PERS_CARTE, POINTER_IND, RECUP_SOLD_CNG, REGIME_REGIME, RENSEIGNEMENT_PERS, VERIF_PLANING_CNG

### 4.4 Constats NULL critiques

Colonnes a fort impact data quality:
- PERSONNEL.CODE_DOMAINE: 76,546 NULL (83.52%)
- PERSONNEL.COD_TYP_DEPART: 91,651 NULL (100%)
- FICHE_CANDIDAT.COD_MOTIF_BONIF: 4,797 NULL (79.95%)

Colonnes tres nulles (top volumetrique):
- POINTER (100% NULL): TYP_REG, TEMP_COMP, S_POINT, OLD_TYP_POINT, N_CARTE, NUM_POINTEUSE, INTERMED, ID_POINTER, COD_REG, COD_AUTO
- CAL_PERS (100% NULL): UNITE, SEANCE, REGIME_TRAV, REGIME_HEUR, PREC_COD_M, ID_CAL_PERS, DT_BUL, DROIT_ASTR, COD_TYP_BUL, COD_REG, COD_FIL
- DEM_CNG (100% NULL): TEL, SPECIALITE, SOLD_CNG, SEQ_ALERT, RETENUE_MOIS, RESIDENCE_A, RESIDENCE, REG_CNG, REGIME_TRAV
- POINTER (50% NULL): DUREE_TOT, DUREE_M, DUREE_H

### 4.5 Qualite sur colonnes de segmentation RH

- PERSONNEL.COD_GOUV: 0% NULL, 24 valeurs distinctes
- PERSONNEL.COD_SERV: 0% NULL, 128 valeurs distinctes
- PERSONNEL.COD_GRAD: 0% NULL, 4 valeurs distinctes
- PERSONNEL.COD_FONCT: 100% NULL (non exploitable pour KPI principal)

### 4.6 Focus sur tables cibles

- ABSENCE: table absente dans ce snapshot
- PERSONNEL, DEM_CNG, POINTER, CONTRAT, FAMILLE, MOUVEMENT_PERS: exploitables
- PERSONNEL_RECRUT, POINTER_IND: presentes mais vides

## 5) Snapshot KPI calcule

### 5.1 Effectif RH

- Effectif total: 91,651
- Repartition sexe:
  - F: 50,382 (54.97%)
  - M: 41,269 (45.03%)
- Repartition ETAT_ACT:
  - 0: 84,399 (92.09%)
  - 1: 2,794 (3.05%)
  - 5: 2,669 (2.91%)
  - 8: 1,789 (1.95%)
- Ratio contrat/personnel: 1.0000
- Ratio famille/personnel: 1.7536

### 5.2 Conges

- DEM_CNG total: 674,902
- Validite congé (VALID):
  - O: 487,596 (72.25%)
  - N: 94,891 (14.06%)
  - I: 92,415 (13.69%)
- Etat congé (ETAT_CNG):
  - C: 487,596
  - R: 94,891
  - E: 92,415
- Top motifs (CODE_M): 01 (405,875), 02 (100,669), 11 (27,007), 20 (26,999), 10 (20,257), 04 (20,254), 16 (20,246), 12 (20,116), 13 (20,101), 15 (13,378)
- NBR_JOURS:
  - moyenne: 11.7022
  - min: 1
  - max: 90
  - NULL: 0%
- Couverture justificatifs (jointure COD_SOC + MAT_PERS + NUM_DCNG):
  - demandes totales: 674,902
  - demandes justifiees: 120,923
  - taux couverture: 17.92%
- Solde conge SOLD_CNG (table SOLD_CNG): moyenne 17.09, min 1, max 45
- PLANING_CNG ETAT_PLANING = V: 56,266 (couverture approx vs personnel: 61.39%)

### 5.3 Pointage et retard

- POINTAGE total: 13,484,398
- Repartition TYP_POINT:
  - E: 6,742,199
  - S: 6,742,199
- Agents distincts pointes (MAT_PERS): 84,399
- Couverture pointage vs effectif: 92.09%
- RETARD_JOURNEE total: 337,296
- Agents distincts en retard: 82,954
- Couverture retard vs effectif: 90.51%

### 5.4 Mobilite

- MOUVEMENT_PERS total: 91,651
- Agents distincts en mouvement: 91,651
- COD_MVT:
  - 01: 91,651
- ETAT_MVT:
  - V: 91,651
- ETAT_ACT:
  - 0: 91,651

### 5.5 Recrutement

- CONCOURS total: 37
  - ETAT_CONC: E (22), T (15)
  - TYPE_CONCOURS: E (15), I (14), D (8)
- FICHE_CANDIDAT total: 6,000
  - ETAT_FICHE: 9 (3,043), 6 (1,214), 3 (903), 4 (556), 7 (284)
  - RESULT_FINAL: A (3,043), R (556), NULL (2,401)
  - Taux RESULT_FINAL:
    - A: 50.72%
    - R: 9.27%
    - NULL: 40.02%
- STAGE total: 5,000
  - ETAT: T (4,229 = 84.58%), E (771 = 15.42%)
- FICHE_EVAL_RECRU: 3,043
- DET_FICHE_EVAL_RECRU: 9,129

### 5.6 Perimetres temporels observes

- MOUVEMENT_PERS.DAT_MVT: 1985-01-01 a 2024-06-29
- DEM_CNG.DAT_DEBUT: 2024-01-01 a 2025-12-28
- POINTER.DATE_POINT: 2024-02-01 a 2025-10-31
- RETARD_JOURNEE.DAT_POINT: 2024-02-01 a 2025-10-31

## 6) Themes PFE recommandés avec tables et KPI

### Theme 1 - Pilotage effectif et structure RH (priorite haute)

Tables:
- PERSONNEL, CONTRAT, FAMILLE
- SERVICE, GOUVERNORAT, GRADE

KPI:
- Effectif total
- Repartition H/F
- Repartition ETAT_ACT
- Effectif par service, gouvernorat, grade
- Ratio contrat/personnel
- Ratio famille/personnel

### Theme 2 - Conges et disponibilite (priorite haute)

Tables:
- DEM_CNG, JUSTIF_DEM_CNG, SOLD_CNG, PLANING_CNG
- TYP_CONGE, MOTIF_J, PLAF_MOTIF_CNG

KPI:
- Volume de demandes
- Taux validation/refus/en attente
- Duree moyenne conge
- Top motifs conge
- Taux de conges justifies
- Solde moyen de conge

### Theme 3 - Pointage, ponctualite, proxy absentéisme (priorite haute)

Tables:
- POINTER, RETARD_JOURNEE, CAL_PERS

KPI:
- Couverture pointage des agents
- Nb pointages E/S
- Nb retards
- Duree moyenne retard
- Tendance journaliere/mensuelle pointage-retard

Note:
- ABSENCE est absente, donc absentéisme direct non calculable actuellement

### Theme 4 - Mobilite et carriere (priorite moyenne)

Tables:
- MOUVEMENT_PERS, AFFECTATION, SERVICE, POSTE_TRAV, METIER

KPI:
- Nb mouvements
- Delai date mouvement -> date effet
- Mobilite par service/region
- Evolution etat mouvement

### Theme 5 - Recrutement et evaluation (priorite moyenne)

Tables:
- CONCOURS, FICHE_CANDIDAT, DET_FICHE_CANDIDAT
- FICHE_EVAL_RECRU, DET_FICHE_EVAL_RECRU, STAGE

KPI:
- Nb concours
- Nb candidatures
- Taux admission/refus
- Score moyen candidature
- Completion evaluation

## 7) Reponse a la question: modele en etoile par theme?

Oui.
En BI, le modele en etoile est en general construit par theme (par processus metier). Pour ton projet, il faut faire une etoile par theme principal, puis partager les dimensions communes. L ensemble devient une constellation de faits.

## 8) Modeles en etoile proposes (par theme)

## 8.1 Etoile Effectif RH

Grain:
- 1 ligne par agent par date de snapshot

Table de fait:
- F_EFFECTIF_SNAPSHOT

Mesures:
- NB_AGENT (1)
- AGE
- ANCIENNETE_JOURS

Dimensions:
- D_TEMPS
- D_PERSONNEL
- D_SERVICE
- D_GOUVERNORAT
- D_GRADE
- D_ETAT_ACT
- D_SEXE

Sources:
- PERSONNEL + dimensions de reference

## 8.2 Etoile Conges

Grain:
- 1 ligne par demande (COD_SOC, MAT_PERS, NUM_DCNG)

Table de fait:
- F_DEMANDE_CONGE

Mesures:
- NB_DEMANDE (1)
- NBR_JOURS
- NBR_HEURE
- NBR_JOURS_CAL

Dimensions:
- D_TEMPS (roles: date demande, debut, fin)
- D_PERSONNEL
- D_SERVICE
- D_MOTIF_CONGE
- D_STATUT_CONGE (VALID, ETAT_CNG, NAT_CNG)

Fact complementaire:
- F_JUSTIFICATIF_CONGE

Sources:
- DEM_CNG, JUSTIF_DEM_CNG, MOTIF_J, TYP_CONGE

## 8.3 Etoile Pointage

Grain:
- 1 ligne par evenement de pointage

Table de fait:
- F_POINTAGE

Mesures:
- NB_POINTAGE (1)
- RET_MIN
- DUREE_TOT

Dimensions:
- D_TEMPS
- D_PERSONNEL
- D_SERVICE
- D_TYPE_POINTAGE

Sources:
- POINTER

## 8.4 Etoile Retard journalier

Grain:
- 1 ligne par retard journalier

Table de fait:
- F_RETARD_JOURNALIER

Mesures:
- NB_RETARD (1)
- DUREE_TOT

Dimensions:
- D_TEMPS
- D_PERSONNEL
- D_SERVICE
- D_ETAT_RETARD

Sources:
- RETARD_JOURNEE

## 8.5 Etoile Mobilite

Grain:
- 1 ligne par mouvement (NUM_MVT)

Table de fait:
- F_MOUVEMENT_PERSONNEL

Mesures:
- NB_MVT (1)
- DELAI_EFFET_J

Dimensions:
- D_TEMPS (date mvt, date effet)
- D_PERSONNEL
- D_TYPE_MOUVEMENT
- D_ETAT_MOUVEMENT
- D_SERVICE (source/destination)
- D_GRADE (source/destination)

Sources:
- MOUVEMENT_PERS

## 8.6 Etoile Recrutement

Grain:
- 1 ligne par candidature (NUM_FICHE + CODE_CONCOURS)

Table de fait:
- F_CANDIDATURE

Mesures:
- NB_CANDIDATURE (1)
- MOYEN_FINAL
- CLASSEMENT

Dimensions:
- D_TEMPS (date depot, date concours)
- D_CONCOURS
- D_CANDIDAT
- D_ETAT_CANDIDATURE
- D_RESULTAT

Sources:
- FICHE_CANDIDAT, CONCOURS, DET_FICHE_CANDIDAT

Fact complementaire:
- F_EVAL_RECRUTEMENT (grain: ligne critere d evaluation)

## 9) Limites et recommandations

- ABSENCE absente: calcul absentéisme direct non possible
- Colonnes a ignorer au debut pour KPI principaux:
  - PERSONNEL.COD_TYP_DEPART (100% NULL)
  - PERSONNEL.CODE_DOMAINE (83.52% NULL)
  - FICHE_CANDIDAT.COD_MOTIF_BONIF (79.95% NULL)
- Commencer le datamart avec 3 themes prioritaires:
  - Effectif
  - Conges
  - Pointage/Retard
- Ajouter Mobilite et Recrutement en phase 2

## 10) Fichiers techniques produits pendant l audit

- migration/audit_grh_msp_report.txt
- migration/audit_table_counts.csv
- migration/audit_null_stats_full.csv

Ces fichiers contiennent le detail brut complet (comptes, top NULL, focus tables).

## 11) Conclusion

La base grh_msp est suffisante pour un PFE BI solide si le perimetre initial est centre sur:
- Effectif RH
- Conges
- Pointage/Retard

Le modele cible recommande est une constellation de plusieurs etoiles, une etoile par theme, avec dimensions partagees (Temps, Personnel, Service, Region).
