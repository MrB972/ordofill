/**
 * Calibration Store for Cerballiance PDF — V2
 * 
 * Each field has: x, y, label, type, section, fontSize, wordSpacing
 * Supports: add, delete, rename, update all properties
 * Persistence: Supabase (save as default) + JSON export/import
 */

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

// ---- Types ----

export type ComboOrder = "check_text" | "text_check";

export interface FieldCoord {
  x: number;
  y: number;
  label: string;
  type: "check" | "text" | "combo" | "combo_date";
  section: string;
  /** Font size in PDF points. Default: 8 for text, 8 for checks */
  fontSize: number;
  /** Extra spacing in points between words (separators: space, /, -, .). 0 = normal */
  wordSpacing: number;
  /** For combo/combo_date fields: order of check(X) and text/date. Default: "check_text" (X → Texte/Date) */
  comboOrder?: ComboOrder;
}

export type CalibrationMap = Record<string, FieldCoord>;

// ---- Default coordinates (from V3) ----

const COL1_X = 15;
const COL2_X = 172;
const COL3_X = 298;
const COL4_X = 464;
const JAUNE_START_Y = 405;
const JAUNE_ROW_H = 9.3;
function jauneY(row: number): number { return JAUNE_START_Y + row * JAUNE_ROW_H; }

/** Helper: create a text field with defaults */
function t(x: number, y: number, label: string, section: string, fontSize = 8): FieldCoord {
  return { x, y, label, type: "text", section, fontSize, wordSpacing: 0 };
}

/** Helper: create a check field with defaults */
function c(x: number, y: number, label: string, section: string): FieldCoord {
  return { x, y, label, type: "check", section, fontSize: 8, wordSpacing: 0 };
}

/** Helper: create a combo field (checkbox + text) */
function combo(x: number, y: number, label: string, section: string, order: ComboOrder = "check_text"): FieldCoord {
  return { x, y, label, type: "combo", section, fontSize: 8, wordSpacing: 0, comboOrder: order };
}

export function getDefaultCalibration(): CalibrationMap {
  return {
    // ============ TEXT FIELDS ============
    "text_prescripteur": t(290, 102, "Prescripteur", "header"),
    "text_medecinTraitant": t(530, 97, "Médecin traitant", "header"),
    "text_ideName": t(35, 167, "IDE Nom", "ide"),
    "text_ideCabinet": t(55, 180, "IDE Cabinet", "ide"),
    "text_datePrelevement": t(120, 195, "Date prélèvement", "ide"),
    "text_heurePrelevement": t(130, 220, "Heure prélèvement", "ide"),
    "text_nomUsuel": t(340, 168, "Nom usuel", "patient"),
    "text_nomNaissance": t(510, 163, "Nom naissance", "patient"),
    "text_prenoms": t(330, 180, "Prénoms", "patient"),
    "text_telephone": t(490, 188, "Téléphone", "patient"),
    "text_dateNaissance": t(325, 195, "Date naissance", "patient"),
    "text_adresse": t(330, 210, "Adresse", "patient", 6.5),
    "text_numSecu": t(310, 222, "N°SS", "patient"),
    "text_traitements": t(130, 270, "Traitements", "clinique", 6.5),
    "text_posologie": t(200, 377, "Posologie", "anticoagulant"),
    "text_dateRenouvelable": t(220, 102, "Date renouvelable", "header"),

    // ============ CHECKBOXES ============
    "check_urgent": c(492, 102, "Urgent", "header"),
    "check_renouvelable": c(113, 102, "Renouvelable", "header"),

    // Résultats: Médecin
    "check_\u00e0_Faxer": c(109, 125, "\u00e0 Faxer", "header"),
    "check_\u00e0_t\u00e9l\u00e9phoner": c(152, 125, "\u00e0 t\u00e9l\u00e9phoner (M\u00e9d.)", "header"),
    "check_\u00e0_poster": c(210, 125, "\u00e0 poster", "header"),
    // R\u00e9sultats: IDE
    "check_\u00e0_t\u00e9l\u00e9phoner_1": c(33, 133, "\u00e0 t\u00e9l\u00e9phoner (IDE)", "header"),
    "check_SMS_avec_consentement_patient": c(93, 133, "SMS (avec consentement patient)", "header"),
    // R\u00e9sultats: Patient
    "check_Patient": c(303, 122, "Patient", "header"),
    "check_au_laboratoire": c(367, 122, "au laboratoire", "header"),
    "check_Internet": c(412, 125, "Internet", "header"),
    "check_SMS": c(455, 118, "SMS", "header"),
    "check_Le_patient_soppose_\u00e0_la_communication_de_r\u00e9sultats_\u00e0_lIDE": c(233, 133, "Le patient s'oppose \u00e0 la communication de r\u00e9sultats \u00e0 l'IDE", "header"),
    "check_Contr\u00f4le_demand\u00e9": c(256, 105, "Contr\u00f4le demand\u00e9", "header"),

    // Pi\u00e8ce justificative
    "check_CNI": c(390, 145, "CNI", "patient"),
    "check_Passeport": c(430, 145, "Passeport", "patient"),
    "check_Titre_ou_carte_de_s\u00e9jour": c(490, 145, "Titre ou carte de s\u00e9jour", "patient"),

    // Patient - Mutuelle & Fin de droit
    "text_mutuelle": t(380, 225, "Mutuelle", "patient"),
    "text_finDeDroit": t(480, 225, "Fin de droit", "patient"),

    "check_sexeH": c(505, 170, "Sexe H", "patient"),
    "check_sexeF": c(528, 170, "Sexe F", "patient"),
    "check_grossesse": c(250, 263, "Grossesse", "clinique"),
    "check_fievre": c(345, 263, "Fièvre", "clinique"),
    "check_inr23": c(432, 377, "INR 2-3", "anticoagulant"),
    "check_inr345": c(492, 377, "INR 3-4,5", "anticoagulant"),

    // Anticoagulants
    "check_Sintrom": c(82, 365, "Sintrom", "anticoagulant"),
    "check_Previscan": c(140, 365, "Previscan", "anticoagulant"),
    "check_Coumadine": c(210, 365, "Coumadine", "anticoagulant"),
    "check_Fraxi": c(290, 365, "Fraxi", "anticoagulant"),
    "check_Lovenox": c(342, 365, "Lovenox", "anticoagulant"),
    "check_Innohep": c(405, 365, "Innohep", "anticoagulant"),
    "check_Calciparine": c(468, 365, "Calciparine", "anticoagulant"),
    "check_Orgaran": c(540, 365, "Orgaran", "anticoagulant"),
    "check_Rivaroxaban": c(365, 377, "Rivaroxaban", "anticoagulant"),
    "check_Apixaban": c(438, 377, "Apixaban", "anticoagulant"),
    "check_Dabigatran": c(510, 377, "Dabigatran", "anticoagulant"),

    // TUBE BLEU
    "check_INR": c(14, 349, "INR", "tube_bleu"),
    "check_TCA": c(62, 349, "TCA", "tube_bleu"),
    "check_Fibrine": c(112, 349, "Fibrine", "tube_bleu"),
    "check_TP": c(155, 349, "TP", "tube_bleu"),
    "check_AT3": c(210, 349, "AT3", "tube_bleu"),
    "check_Plaquettes sur tube citrate": c(378, 349, "Plaquettes citrate", "tube_bleu"),
    "check_Ddimeres": c(505, 349, "D-dimères", "tube_bleu"),

    // TUBE JAUNE Col 1
    "check_ACE": c(COL1_X, jauneY(0), "ACE", "tube_jaune"),
    "check_Acide urique": c(COL1_X, jauneY(1), "Acide urique", "tube_jaune"),
    "check_AFP": c(COL1_X, jauneY(2), "AFP", "tube_jaune"),
    "check_Ag HBS": c(COL1_X, jauneY(3), "Ag HBS", "tube_jaune"),
    "check_ALAT / ASAT": c(COL1_X, jauneY(4), "ALAT/ASAT", "tube_jaune"),
    "check_Albumine": c(COL1_X, jauneY(5), "Albumine", "tube_jaune"),
    "check_Apo A / Apo B": c(COL1_X, jauneY(6), "Apo A/B", "tube_jaune"),
    "check_B2 microglobuline": c(COL1_X, jauneY(7), "B2 micro", "tube_jaune"),
    "check_Bicarbonates": c(COL1_X, jauneY(8), "Bicarbonates", "tube_jaune"),
    "check_Bilan hepatique": c(COL1_X, jauneY(9), "Bilan hép.", "tube_jaune"),
    "check_Bilan lipidique": c(COL1_X, jauneY(10), "Bilan lip.", "tube_jaune"),
    "check_Bilirubine": c(COL1_X, jauneY(11), "Bilirubine", "tube_jaune"),
    "check_CA 125": c(COL1_X, jauneY(12), "CA 125", "tube_jaune"),
    "check_CA 153.3": c(COL1_X, jauneY(13), "CA 153.3", "tube_jaune"),
    "check_CA 19.9": c(COL1_X, jauneY(14), "CA 19.9", "tube_jaune"),
    "check_Calcium / Calcium corrige": c(COL1_X, jauneY(15), "Calcium", "tube_jaune"),
    "check_CMV": c(COL1_X, jauneY(16), "CMV", "tube_jaune"),

    // TUBE JAUNE Col 2
    "check_Cholesterol / triglycerides": c(COL2_X, jauneY(0), "Cholest/Trig", "tube_jaune"),
    "check_Coefficient de saturation": c(COL2_X, jauneY(1), "Coeff sat.", "tube_jaune"),
    "check_Cortisol": c(COL2_X, jauneY(2), "Cortisol", "tube_jaune"),
    "check_CPK": c(COL2_X, jauneY(3), "CPK", "tube_jaune"),
    "check_Creatinine": c(COL2_X, jauneY(4), "Créatinine", "tube_jaune"),
    "check_CRP / CRP us": c(COL2_X, jauneY(5), "CRP", "tube_jaune"),
    "check_DHEAS": c(COL2_X, jauneY(6), "DHEAS", "tube_jaune"),
    "check_DFG": c(COL2_X, jauneY(7), "DFG", "tube_jaune"),
    "check_Estradiol": c(COL2_X, jauneY(10), "Estradiol", "tube_jaune"),
    "check_Fer serique": c(COL2_X, jauneY(11), "Fer sérique", "tube_jaune"),
    "check_Ferritine": c(COL2_X, jauneY(12), "Ferritine", "tube_jaune"),
    "check_Folates seriques": c(COL2_X, jauneY(13), "Folates", "tube_jaune"),
    "check_Fructosamine": c(COL2_X, jauneY(15), "Fructosamine", "tube_jaune"),
    "check_GGT": c(COL2_X, jauneY(16), "GGT", "tube_jaune"),

    // TUBE JAUNE Col 3
    "check_Hepatite A / B / C": c(COL3_X, jauneY(0), "Hépatite ABC", "tube_jaune"),
    "check_HIV": c(COL3_X, jauneY(1), "HIV", "tube_jaune"),
    "check_HTLV": c(COL3_X, jauneY(2), "HTLV", "tube_jaune"),
    "check_IgA / IgG / IgM / IgE totales": c(COL3_X, jauneY(3), "Ig totales", "tube_jaune"),
    "check_Ionogramme complet": c(COL3_X, jauneY(4), "Ionogramme", "tube_jaune"),
    "check_LDH": c(COL3_X, jauneY(6), "LDH", "tube_jaune"),
    "check_Lipase": c(COL3_X, jauneY(7), "Lipase", "tube_jaune"),
    "check_Magnesium": c(COL3_X, jauneY(8), "Magnésium", "tube_jaune"),
    "check_Na / K / Cl": c(COL3_X, jauneY(9), "Na/K/Cl", "tube_jaune"),
    "check_PAL": c(COL3_X, jauneY(10), "PAL", "tube_jaune"),
    "check_Phosphore": c(COL3_X, jauneY(11), "Phosphore", "tube_jaune"),
    "check_Prealbumine": c(COL3_X, jauneY(12), "Préalbumine", "tube_jaune"),
    "check_Progesterone": c(COL3_X, jauneY(13), "Progestérone", "tube_jaune"),
    "check_Prolactine": c(COL3_X, jauneY(14), "Prolactine", "tube_jaune"),
    "check_Protides": c(COL3_X, jauneY(15), "Protides", "tube_jaune"),

    // TUBE JAUNE Col 4
    "check_PSA / PSA LIBRE": c(COL4_X, jauneY(0), "PSA", "tube_jaune"),
    "check_PTH": c(COL4_X, jauneY(1), "PTH", "tube_jaune"),
    "check_Rubeole": c(COL4_X, jauneY(2), "Rubéole", "tube_jaune"),
    "check_Syphilis": c(COL4_X, jauneY(3), "Syphilis", "tube_jaune"),
    "check_T3L / T4L": c(COL4_X, jauneY(4), "T3L/T4L", "tube_jaune"),
    "check_Testosterone": c(COL4_X, jauneY(5), "Testostérone", "tube_jaune"),
    "check_Toxoplasmose": c(COL4_X, jauneY(6), "Toxoplasmose", "tube_jaune"),
    "check_TSH": c(COL4_X, jauneY(7), "TSH", "tube_jaune"),
    "check_Uree": c(COL4_X, jauneY(8), "Urée", "tube_jaune"),
    "check_Vit B12": c(COL4_X, jauneY(9), "Vit B12", "tube_jaune"),
    "check_Vit D": c(COL4_X, jauneY(10), "Vit D", "tube_jaune"),

    // CARDIAQUES
    "check_NTproBNP": c(18, 590, "NTproBNP", "cardiaques"),
    "check_Troponine": c(88, 590, "Troponine", "cardiaques"),
    "check_Electrophorese des protides / Immunotypage": c(20, 608, "Electrophorèse prot.", "cardiaques"),

    // RHUMATO
    "check_ENA / AAN / ACADN": c(18, 635, "ENA/AAN/ACADN", "rhumato"),
    "check_Facteurs rhumatoides": c(160, 635, "Facteurs rhumatoïdes / Latex Waaler-Rose", "rhumato"),

    // SEROLOGIES
    "check_Serologie H.Pylori": c(22, 675, "Séro. H.Pylori", "serologies"),
    "check_Serologie C.trachomatis IgG": c(22, 675, "Séro. C.trachomatis", "serologies"),
    "check_Procalcitonie": c(320, 675, "Procalcitonie", "serologies"),

    // CHLORDECONE
    "check_Chlordecone": c(20, 692, "Chlordécone", "chlordecone"),

    // TUBE VERT
    "check_Bicarbonates / Reserve alcaline": c(465, 692, "Bicarb/Rés. alc.", "tube_vert"),

    // TUBE VIOLET
    "check_NFS": c(18, 730, "NFS", "tube_violet"),
    "check_VS": c(58, 730, "VS", "tube_violet"),
    "check_Reticulocytes": c(103, 730, "Réticulocytes", "tube_violet"),
    "check_BNP": c(218, 730, "BNP", "tube_violet"),
    "check_HbA1C": c(398, 730, "HbA1C", "tube_violet"),
    "check_Plaquettes": c(18, 742, "Plaquettes", "tube_violet"),
    "check_Electrophorese HB": c(20, 755, "Electrophorèse HB", "tube_violet"),
    "check_RAI": c(18, 787, "RAI", "tube_violet"),
    "check_Groupe sanguin": c(185, 787, "Groupe sanguin", "tube_violet"),

    // TUBE GRIS
    "check_Glycemie a Jeun": c(490, 730, "Glycémie à jeun", "tube_gris"),
    "check_GPP": c(490, 742, "GPP", "tube_gris"),
    "text_GPP_heure": t(530, 742, "GPP Préciser heure", "tube_gris"),
    "check_GPP_apres_dejeuner": c(490, 754, "Après déjeuner", "tube_gris"),
    "check_GPP_apres_petit_dejeuner": c(540, 754, "Après petit déjeuner", "tube_gris"),

    // ============ PAGE 1 ENRICHMENTS ============

    // Patient enrichment
    "text_nomNaissanceVal": t(510, 168, "Nom de naissance (valeur)", "patient"),
    "text_lieuNaissance": t(430, 195, "Lieu de naissance", "patient"),
    "text_etablissementSoins": t(310, 237, "Établissement de soins", "patient"),
    "text_demandeEtiquettes": t(490, 237, "Demande d'étiquettes", "patient"),

    // Clinique enrichment — Pathologie connue (combo: checkbox + text)
    "combo_pathologieConnue": combo(130, 280, "Pathologie connue", "clinique"),

    // Clinique enrichment — Renseignements cliniques détaillés (Page 1)
    "check_chimiotherapie": c(170, 283, "Chimiothérapie", "clinique"),
    "check_antibiotherapie": c(270, 283, "Antibiothérapie", "clinique"),
    "check_dialyse": c(370, 283, "Dialyse", "clinique"),
    "check_suiviHemopathie": c(420, 283, "Suivi hémopathie", "clinique"),
    "check_traitementEPO": c(508, 283, "Traitement EPO", "clinique"),
    "check_injectionRhophylac": c(18, 297, "Injection récente Rhophylac", "clinique"),
    "text_cliniqueRhophylacDate": t(160, 297, "Rhophylac Date", "clinique"),
    "check_transfusion4mois": c(280, 297, "Transfusion < 4 mois", "clinique"),
    "text_cliniqueMedicamentsDateHeure": t(155, 311, "Médicaments date/heure dernière prise", "clinique"),
    "text_cliniqueDateDernieresRegles": t(380, 311, "Date dernières règles", "clinique"),
    "text_cliniqueAutres": t(50, 325, "Autres", "clinique"),

    // Prélèvement enrichment
    "check_sansGarrot": c(15, 300, "Sans garrot", "prelevement_p1"),
    "check_veinesDifficiles": c(100, 300, "Veines difficiles", "prelevement_p1"),
    "text_prelevementAutres": t(200, 300, "Autres", "prelevement_p1"),
    "text_nbTubes": t(350, 300, "Nb tubes", "prelevement_p1"),

    // ============ PAGE 2 FIELDS ============

    // RENSEIGNEMENTS CLINIQUES URINAIRES (p2)
    "text_p2_antibio": t(190, 50, "Antibiothérapie en cours ou < 7 jours", "p2_rc_urinaires"),
    "check_p2_chimiotherapie": c(380, 50, "Chimiothérapie", "p2_rc_urinaires"),
    "check_p2_fievreUrines": c(15, 65, "Fièvre et/ou frissons", "p2_rc_urinaires"),
    "check_p2_grossesseUrines": c(150, 65, "Grossesse en cours", "p2_rc_urinaires"),
    "text_p2_autreRcUrinaire": t(310, 65, "Autre", "p2_rc_urinaires"),

    // BIOCHIMIE URINAIRE (p2)
    "check_p2_24h": c(15, 100, "24h", "p2_biochimie_urinaire"),
    "text_p2_24h_dateDebut": t(100, 100, "Date et heure début", "p2_biochimie_urinaire"),
    "text_p2_24h_dateFin": t(280, 100, "Date et heure fin", "p2_biochimie_urinaire"),
    "text_p2_diurese": t(440, 100, "Diurèse", "p2_biochimie_urinaire"),
    "check_p2_echantillon": c(540, 100, "Échantillon", "p2_biochimie_urinaire"),
    "check_p2_proteinurie": c(15, 118, "Protéinurie", "p2_biochimie_urinaire"),
    "check_p2_glycosurie": c(15, 130, "Glycosurie", "p2_biochimie_urinaire"),
    "check_p2_microAlbuminurie": c(15, 142, "µ albuminurie", "p2_biochimie_urinaire"),
    "check_p2_ionoUrinaire": c(180, 118, "Iono", "p2_biochimie_urinaire"),
    "check_p2_ureeUrinaire": c(180, 130, "Urée", "p2_biochimie_urinaire"),
    "check_p2_acUriqueUrinaire": c(280, 118, "Ac. urique", "p2_biochimie_urinaire"),
    "check_p2_creatinineUrinaire": c(280, 130, "Créatinine", "p2_biochimie_urinaire"),
    "check_p2_calciumUrinaire": c(420, 118, "Calcium", "p2_biochimie_urinaire"),
    "check_p2_phosphoreUrinaire": c(420, 130, "Phosphore", "p2_biochimie_urinaire"),
    "combo_p2_biochimieAutre": combo(15, 155, "Autre (biochimie urinaire)", "p2_biochimie_urinaire"),

    // ECBU (p2)
    "text_p2_ecbu_date": t(40, 185, "Date ECBU", "p2_ecbu"),
    "text_p2_ecbu_heure": t(130, 185, "Heure ECBU", "p2_ecbu"),
    "check_p2_2emeJet": c(15, 202, "2ème jet urines", "p2_ecbu"),
    "combo_p2_surSonde": combo(130, 202, "Sur sonde à demeure (type)", "p2_ecbu"),
    "check_p2_apresChangementSonde": c(15, 215, "Après changement d'une sonde à demeure", "p2_ecbu"),
    "check_p2_sondage": c(300, 215, "Sondage", "p2_ecbu"),
    "check_p2_collecteurBebe": c(380, 215, "Collecteur (bébé)", "p2_ecbu"),
    "check_p2_collecteurPenien": c(470, 215, "Collecteur pénien", "p2_ecbu"),
    "text_p2_ecbuAutre": t(550, 215, "Autre", "p2_ecbu"),

    // RENSEIGNEMENTS CLINIQUES ECBU (p2)
    "check_p2_fievreEcbu": c(15, 248, "Fièvre et/ou frissons", "p2_rc_ecbu"),
    "check_p2_douleursPubiennes": c(15, 260, "Douleurs sus pubiennes", "p2_rc_ecbu"),
    "check_p2_brulure": c(15, 272, "Brûlure", "p2_rc_ecbu"),
    "check_p2_douleursMictionnelles": c(160, 248, "Douleurs mictionnelles", "p2_rc_ecbu"),
    "check_p2_pollakiurie": c(160, 260, "Pollakiurie", "p2_rc_ecbu"),
    "check_p2_ecoulement": c(160, 272, "Écoulement", "p2_rc_ecbu"),
    "check_p2_douleursLombaires": c(310, 248, "Douleurs lombaires", "p2_rc_ecbu"),
    "check_p2_hematurieMacro": c(310, 260, "Hématurie macroscopique", "p2_rc_ecbu"),
    "text_p2_autreMotifEcbu": t(310, 272, "Autre motif", "p2_rc_ecbu"),
    "check_p2_mictionsImperieuses": c(440, 248, "Mictions impérieuses", "p2_rc_ecbu"),
    "check_p2_absenceSignes": c(440, 260, "Absence de signes urinaires", "p2_rc_ecbu"),
    "check_p2_dysurie": c(540, 260, "Dysurie", "p2_rc_ecbu"),

    // ÉTAT PHYSIOLOGIQUE (p2)
    "check_p2_grossesseEtat": c(15, 320, "Grossesse en cours", "p2_etat_physio"),
    "check_p2_bilanPreop": c(150, 320, "Bilan préopératoire", "p2_etat_physio"),
    "check_p2_chimiotherapieEtat": c(280, 320, "Chimiothérapie", "p2_etat_physio"),
    "check_p2_greffe": c(380, 320, "Greffe", "p2_etat_physio"),
    "check_p2_dialyse": c(440, 320, "Dialysé(e)", "p2_etat_physio"),
    "check_p2_hospiRecente": c(15, 335, "Hospitalisation récente, vie en institution", "p2_etat_physio"),
    "check_p2_antibio7j": c(15, 348, "Prise d'antibiotiques dans les 7 derniers jours", "p2_etat_physio"),
    "text_p2_antibioLequel": t(350, 348, "Si oui lequel ?", "p2_etat_physio"),

    // PLAIE / PUS (p2)
    "text_p2_plaie_date": t(40, 390, "Date", "p2_plaie_pus"),
    "text_p2_plaie_heure": t(130, 390, "Heure", "p2_plaie_pus"),
    "text_p2_plaie_aspect": t(250, 390, "Aspect", "p2_plaie_pus"),
    "text_p2_plaie_localisation": t(420, 390, "Localisation", "p2_plaie_pus"),
    "text_p2_plaie_contexte": t(100, 405, "Contexte clinique", "p2_plaie_pus"),

    // SELLES (p2)
    "check_p2_coproculture": c(140, 445, "Coproculture", "p2_selles"),
    "check_p2_parasitologie": c(280, 445, "Parasitologie", "p2_selles"),
    "check_p2_sangSelles": c(420, 445, "Sang dans les selles", "p2_selles"),
    "text_p2_selles_date": t(40, 462, "Date", "p2_selles"),
    "text_p2_selles_heure": t(130, 462, "Heure", "p2_selles"),
    "check_p2_diarrhees": c(15, 478, "Diarrhées", "p2_selles"),
    "check_p2_douleursIntestinales": c(100, 478, "Douleurs intestinales", "p2_selles"),
    "check_p2_constipation": c(240, 478, "Épisodes de constipation", "p2_selles"),
    "text_p2_sellesAutre": t(400, 478, "Autre", "p2_selles"),
    "text_p2_voyageZone": t(200, 495, "Voyage récent en zone à risque", "p2_selles"),
    "check_p2_medecineTravail": c(430, 495, "Médecine du travail", "p2_selles"),

    // HÉMOCULTURES (p2)
    "check_p2_H1": c(15, 535, "H-1", "p2_hemocultures"),
    "check_p2_H2": c(60, 535, "H-2", "p2_hemocultures"),
    "check_p2_H3": c(105, 535, "H-3", "p2_hemocultures"),
    "check_p2_prelevPeripherique": c(250, 535, "Prélèvement périphérique", "p2_hemocultures"),
    "check_p2_prelevCatheter": c(420, 535, "Prélèvement sur cathéter", "p2_hemocultures"),
    "text_p2_hemo_date": t(40, 552, "Date", "p2_hemocultures"),
    "text_p2_hemo_heure": t(130, 552, "Heure", "p2_hemocultures"),
    "text_p2_fievreTemp": t(430, 552, "Fièvre T°", "p2_hemocultures"),
    "check_p2_suspicionEndocardite": c(15, 568, "Suspicion d'endocardite", "p2_hemocultures"),

    // AUTRES (p2)
    "text_p2_autres_date": t(40, 608, "Date", "p2_autres"),
    "text_p2_autres_heure": t(130, 608, "Heure", "p2_autres"),
    "text_p2_autres_nature": t(250, 608, "Nature", "p2_autres"),
    "text_p2_autres_localisation": t(420, 608, "Localisation", "p2_autres"),
    "text_p2_autres_contexte": t(100, 625, "Contexte clinique", "p2_autres"),

    // RÉCEPTION LABORATOIRE (p2)
    "text_p2_secretaire": t(100, 660, "Secrétaire — Identité", "p2_reception"),
    "text_p2_technicien": t(340, 660, "Technicien — Identité", "p2_reception"),
    "text_p2_reception_date": t(340, 675, "Date", "p2_reception"),
    "text_p2_reception_heure": t(480, 675, "Heure", "p2_reception"),

    // NON-CONFORMITÉ (p2)
    "check_p2_nc_identPrelevement": c(15, 710, "Identification prélèvement", "p2_non_conformite"),
    "check_p2_nc_ordonnance": c(170, 710, "Ordonnance", "p2_non_conformite"),
    "check_p2_nc_tubesTrop": c(300, 710, "Tubes en trop", "p2_non_conformite"),
    "check_p2_nc_tubesManquants": c(390, 710, "Tubes manquants", "p2_non_conformite"),
    "check_p2_nc_caillotHemolyse": c(490, 710, "Caillot, hémolyse, volume", "p2_non_conformite"),
    "check_p2_nc_tubesPerimes": c(15, 725, "Tubes périmés", "p2_non_conformite"),
    "check_p2_nc_identPatient": c(120, 725, "Identification patient", "p2_non_conformite"),
    "check_p2_nc_prelevHeure": c(250, 725, "Prélèvement : préleveur-heure", "p2_non_conformite"),
    "check_p2_nc_delai": c(430, 725, "DELAI", "p2_non_conformite"),
    "check_p2_nc_delaiDerogation": c(490, 725, "DELAI + dérogation", "p2_non_conformite"),
    "check_p2_nc_renseignementsCliniques": c(180, 740, "Renseignements cliniques", "p2_non_conformite"),
    "text_p2_nc_autre": t(50, 740, "Autre", "p2_non_conformite"),
  };
}

// ---- Sections for grouped display in the editor ----
export const CALIBRATION_SECTIONS = [
  // Page 1
  { id: "header", label: "En-tête", color: "#6366F1" },
  { id: "ide", label: "Préleveur (IDE)", color: "#06B6D4" },
  { id: "patient", label: "Patient", color: "#10B981" },
  { id: "clinique", label: "Renseignements cliniques", color: "#F59E0B" },
  { id: "prelevement_p1", label: "Prélèvement (enrichi)", color: "#14B8A6" },
  { id: "anticoagulant", label: "Anticoagulant", color: "#EF4444" },
  { id: "tube_bleu", label: "Tube bleu", color: "#3B82F6" },
  { id: "tube_jaune", label: "Tube jaune 5mL", color: "#EAB308" },
  { id: "cardiaques", label: "Analyses cardiaques", color: "#F43F5E" },
  { id: "rhumato", label: "Rhumato", color: "#F97316" },
  { id: "serologies", label: "Sérologies", color: "#A855F7" },
  { id: "chlordecone", label: "Chlordécone", color: "#DC2626" },
  { id: "tube_vert", label: "Tube vert", color: "#22C55E" },
  { id: "tube_violet", label: "Tube violet EDTA", color: "#8B5CF6" },
  { id: "tube_gris", label: "Tube gris", color: "#6B7280" },
  // Page 2
  { id: "p2_rc_urinaires", label: "P2 — Rens. cliniques urinaires", color: "#F59E0B" },
  { id: "p2_biochimie_urinaire", label: "P2 — Biochimie urinaire", color: "#F97316" },
  { id: "p2_ecbu", label: "P2 — ECBU", color: "#06B6D4" },
  { id: "p2_rc_ecbu", label: "P2 — Rens. cliniques ECBU", color: "#EAB308" },
  { id: "p2_etat_physio", label: "P2 — État physiologique", color: "#10B981" },
  { id: "p2_plaie_pus", label: "P2 — Plaie / Pus", color: "#EF4444" },
  { id: "p2_selles", label: "P2 — Selles", color: "#A855F7" },
  { id: "p2_hemocultures", label: "P2 — Hémocultures", color: "#F43F5E" },
  { id: "p2_autres", label: "P2 — Autres", color: "#6B7280" },
  { id: "p2_reception", label: "P2 — Réception laboratoire", color: "#3B82F6" },
  { id: "p2_non_conformite", label: "P2 — Non-conformité", color: "#DC2626" },
];

/** Set of section IDs that belong to Page 2 of the PDF */
export const PAGE2_SECTIONS = new Set([
  "p2_rc_urinaires", "p2_biochimie_urinaire", "p2_ecbu", "p2_rc_ecbu",
  "p2_etat_physio", "p2_plaie_pus", "p2_selles", "p2_hemocultures",
  "p2_autres", "p2_reception", "p2_non_conformite",
]);

// ---- In-memory store (singleton) ----
let _calibration: CalibrationMap = getDefaultCalibration();
let _listeners: Array<() => void> = [];

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function getCalibration(): CalibrationMap {
  return _calibration;
}

export function setCalibration(cal: CalibrationMap) {
  _calibration = { ...cal };
  _notify();
}

export function updateFieldCoord(key: string, x: number, y: number) {
  if (_calibration[key]) {
    _calibration = { ..._calibration, [key]: { ..._calibration[key], x, y } };
    _notify();
  }
}

export function updateFieldProp(key: string, prop: keyof FieldCoord, value: number | string) {
  if (_calibration[key]) {
    _calibration = { ..._calibration, [key]: { ..._calibration[key], [prop]: value } };
    _notify();
  }
}

export function renameField(key: string, newLabel: string) {
  if (_calibration[key]) {
    _calibration = { ..._calibration, [key]: { ..._calibration[key], label: newLabel } };
    _notify();
  }
}

export function addField(key: string, field: FieldCoord) {
  _calibration = { ..._calibration, [key]: field };
  _notify();
}

export function deleteField(key: string) {
  const next = { ..._calibration };
  delete next[key];
  _calibration = next;
  _notify();
}

export function resetCalibration() {
  _calibration = getDefaultCalibration();
  _notify();
}

export function subscribeCalibration(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

// ---- Export / Import JSON ----

export function exportCalibrationJSON(): string {
  return JSON.stringify(_calibration, null, 2);
}

export function importCalibrationJSON(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    for (const key of Object.keys(parsed)) {
      const v = parsed[key];
      if (typeof v.x !== "number" || typeof v.y !== "number" || !v.label || !v.type || !v.section) {
        return false;
      }
      // Backfill new fields for old JSON exports
      if (typeof v.fontSize !== "number") v.fontSize = 8;
      if (typeof v.wordSpacing !== "number") v.wordSpacing = 0;
    }
    setCalibration(parsed);
    return true;
  } catch {
    return false;
  }
}

// ---- Supabase persistence ----

const SUPABASE_TABLE = "calibration_defaults";

/**
 * Save the current calibration as the user's default in Supabase.
 * Uses upsert on user_id so there's only one row per user.
 */
export async function saveCalibrationToSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(
        { user_id: userId, calibration_data: _calibration, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("Supabase save error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase save error:", err);
    return false;
  }
}

/**
 * Load the user's default calibration from Supabase.
 * Returns true if a saved calibration was found and loaded.
 */
export async function loadCalibrationFromSupabase(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("calibration_data")
      .eq("user_id", userId)
      .single();
    if (error || !data?.calibration_data) {
      return false;
    }
    // Backfill new fields
    const cal = data.calibration_data as CalibrationMap;
    for (const key of Object.keys(cal)) {
      if (typeof cal[key].fontSize !== "number") cal[key].fontSize = 8;
      if (typeof cal[key].wordSpacing !== "number") cal[key].wordSpacing = 0;
    }
    // Merge with defaults: any keys in defaults missing from Supabase data get backfilled
    const defaults = getDefaultCalibration();
    for (const [key, field] of Object.entries(defaults)) {
      if (!cal[key]) {
        cal[key] = field;
      }
    }
    setCalibration(cal);
    return true;
  } catch {
    return false;
  }
}

// ---- Custom fields detection ----

const _defaultKeys = new Set(Object.keys(getDefaultCalibration()));

/**
 * Returns only the fields that were added by the user (not part of the default set).
 * These need custom input fields in the fiche-labo form.
 */
export function getCustomFields(): CalibrationMap {
  const cal = getCalibration();
  const custom: CalibrationMap = {};
  for (const [key, field] of Object.entries(cal)) {
    if (!_defaultKeys.has(key)) {
      custom[key] = field;
    }
  }
  return custom;
}

/**
 * Hook that returns only custom (user-added) fields.
 */
export function useCustomFields(): CalibrationMap {
  const cal = useCalibration();
  const custom: CalibrationMap = {};
  for (const [key, field] of Object.entries(cal)) {
    if (!_defaultKeys.has(key)) {
      custom[key] = field;
    }
  }
  return custom;
}

// ---- React hook ----

export function useCalibration(): CalibrationMap {
  return useSyncExternalStore(subscribeCalibration, getCalibration);
}
