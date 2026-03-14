/**
 * Calibration Store for Cerballiance PDF
 * 
 * Stores coordinate offsets for all fields and checkboxes.
 * Uses in-memory state with JSON export/import for persistence
 * (no localStorage — blocked in sandboxed iframe).
 * 
 * The "defaults" match the V3 calibrated coordinates in pdf-cerballiance.ts.
 * User overrides are stored as deltas or absolute positions.
 */

// ---- Types ----

export interface FieldCoord {
  x: number;
  y: number;
  label: string;
  type: "check" | "text";
  /** Which section this field belongs to */
  section: string;
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

export function getDefaultCalibration(): CalibrationMap {
  return {
    // ============ TEXT FIELDS ============
    "text_prescripteur": { x: 290, y: 102, label: "Prescripteur", type: "text", section: "header" },
    "text_medecinTraitant": { x: 530, y: 97, label: "Médecin traitant", type: "text", section: "header" },
    "text_ideName": { x: 35, y: 167, label: "IDE Nom", type: "text", section: "ide" },
    "text_ideCabinet": { x: 55, y: 180, label: "IDE Cabinet", type: "text", section: "ide" },
    "text_datePrelevement": { x: 120, y: 195, label: "Date prélèvement", type: "text", section: "ide" },
    "text_heurePrelevement": { x: 130, y: 220, label: "Heure prélèvement", type: "text", section: "ide" },
    "text_nomUsuel": { x: 340, y: 168, label: "Nom usuel", type: "text", section: "patient" },
    "text_nomNaissance": { x: 510, y: 163, label: "Nom naissance", type: "text", section: "patient" },
    "text_prenoms": { x: 330, y: 180, label: "Prénoms", type: "text", section: "patient" },
    "text_telephone": { x: 490, y: 188, label: "Téléphone", type: "text", section: "patient" },
    "text_dateNaissance": { x: 325, y: 195, label: "Date naissance", type: "text", section: "patient" },
    "text_adresse": { x: 330, y: 210, label: "Adresse", type: "text", section: "patient" },
    "text_numSecu": { x: 310, y: 222, label: "N°SS", type: "text", section: "patient" },
    "text_traitements": { x: 130, y: 270, label: "Traitements", type: "text", section: "clinique" },
    "text_posologie": { x: 200, y: 377, label: "Posologie", type: "text", section: "anticoagulant" },

    // ============ CHECKBOXES ============
    // Header
    "check_urgent": { x: 492, y: 102, label: "Urgent", type: "check", section: "header" },
    // Sexe
    "check_sexeH": { x: 505, y: 170, label: "Sexe H", type: "check", section: "patient" },
    "check_sexeF": { x: 528, y: 170, label: "Sexe F", type: "check", section: "patient" },
    // Clinique
    "check_grossesse": { x: 250, y: 263, label: "Grossesse", type: "check", section: "clinique" },
    "check_fievre": { x: 345, y: 263, label: "Fièvre", type: "check", section: "clinique" },
    // INR cible
    "check_inr23": { x: 432, y: 377, label: "INR 2-3", type: "check", section: "anticoagulant" },
    "check_inr345": { x: 492, y: 377, label: "INR 3-4,5", type: "check", section: "anticoagulant" },

    // ---- Anticoagulants ----
    "check_Sintrom": { x: 82, y: 365, label: "Sintrom", type: "check", section: "anticoagulant" },
    "check_Previscan": { x: 140, y: 365, label: "Previscan", type: "check", section: "anticoagulant" },
    "check_Coumadine": { x: 210, y: 365, label: "Coumadine", type: "check", section: "anticoagulant" },
    "check_Fraxi": { x: 290, y: 365, label: "Fraxi", type: "check", section: "anticoagulant" },
    "check_Lovenox": { x: 342, y: 365, label: "Lovenox", type: "check", section: "anticoagulant" },
    "check_Innohep": { x: 405, y: 365, label: "Innohep", type: "check", section: "anticoagulant" },
    "check_Calciparine": { x: 468, y: 365, label: "Calciparine", type: "check", section: "anticoagulant" },
    "check_Orgaran": { x: 540, y: 365, label: "Orgaran", type: "check", section: "anticoagulant" },
    "check_Rivaroxaban": { x: 365, y: 377, label: "Rivaroxaban", type: "check", section: "anticoagulant" },
    "check_Apixaban": { x: 438, y: 377, label: "Apixaban", type: "check", section: "anticoagulant" },
    "check_Dabigatran": { x: 510, y: 377, label: "Dabigatran", type: "check", section: "anticoagulant" },

    // ---- TUBE BLEU ----
    "check_INR": { x: 14, y: 349, label: "INR", type: "check", section: "tube_bleu" },
    "check_TCA": { x: 62, y: 349, label: "TCA", type: "check", section: "tube_bleu" },
    "check_Fibrine": { x: 112, y: 349, label: "Fibrine", type: "check", section: "tube_bleu" },
    "check_TP": { x: 155, y: 349, label: "TP", type: "check", section: "tube_bleu" },
    "check_AT3": { x: 210, y: 349, label: "AT3", type: "check", section: "tube_bleu" },
    "check_Plaquettes sur tube citrate": { x: 378, y: 349, label: "Plaquettes citrate", type: "check", section: "tube_bleu" },
    "check_Ddimeres": { x: 505, y: 349, label: "D-dimères", type: "check", section: "tube_bleu" },

    // ---- TUBE JAUNE Col 1 ----
    "check_ACE": { x: COL1_X, y: jauneY(0), label: "ACE", type: "check", section: "tube_jaune" },
    "check_Acide urique": { x: COL1_X, y: jauneY(1), label: "Acide urique", type: "check", section: "tube_jaune" },
    "check_AFP": { x: COL1_X, y: jauneY(2), label: "AFP", type: "check", section: "tube_jaune" },
    "check_Ag HBS": { x: COL1_X, y: jauneY(3), label: "Ag HBS", type: "check", section: "tube_jaune" },
    "check_ALAT / ASAT": { x: COL1_X, y: jauneY(4), label: "ALAT/ASAT", type: "check", section: "tube_jaune" },
    "check_Albumine": { x: COL1_X, y: jauneY(5), label: "Albumine", type: "check", section: "tube_jaune" },
    "check_Apo A / Apo B": { x: COL1_X, y: jauneY(6), label: "Apo A/B", type: "check", section: "tube_jaune" },
    "check_B2 microglobuline": { x: COL1_X, y: jauneY(7), label: "B2 micro", type: "check", section: "tube_jaune" },
    "check_Bicarbonates": { x: COL1_X, y: jauneY(8), label: "Bicarbonates", type: "check", section: "tube_jaune" },
    "check_Bilan hepatique": { x: COL1_X, y: jauneY(9), label: "Bilan hép.", type: "check", section: "tube_jaune" },
    "check_Bilan lipidique": { x: COL1_X, y: jauneY(10), label: "Bilan lip.", type: "check", section: "tube_jaune" },
    "check_Bilirubine": { x: COL1_X, y: jauneY(11), label: "Bilirubine", type: "check", section: "tube_jaune" },
    "check_CA 125": { x: COL1_X, y: jauneY(12), label: "CA 125", type: "check", section: "tube_jaune" },
    "check_CA 153.3": { x: COL1_X, y: jauneY(13), label: "CA 153.3", type: "check", section: "tube_jaune" },
    "check_CA 19.9": { x: COL1_X, y: jauneY(14), label: "CA 19.9", type: "check", section: "tube_jaune" },
    "check_Calcium / Calcium corrige": { x: COL1_X, y: jauneY(15), label: "Calcium", type: "check", section: "tube_jaune" },
    "check_CMV": { x: COL1_X, y: jauneY(16), label: "CMV", type: "check", section: "tube_jaune" },

    // ---- TUBE JAUNE Col 2 ----
    "check_Cholesterol / triglycerides": { x: COL2_X, y: jauneY(0), label: "Cholest/Trig", type: "check", section: "tube_jaune" },
    "check_Coefficient de saturation": { x: COL2_X, y: jauneY(1), label: "Coeff sat.", type: "check", section: "tube_jaune" },
    "check_Cortisol": { x: COL2_X, y: jauneY(2), label: "Cortisol", type: "check", section: "tube_jaune" },
    "check_CPK": { x: COL2_X, y: jauneY(3), label: "CPK", type: "check", section: "tube_jaune" },
    "check_Creatinine": { x: COL2_X, y: jauneY(4), label: "Créatinine", type: "check", section: "tube_jaune" },
    "check_CRP / CRP us": { x: COL2_X, y: jauneY(5), label: "CRP", type: "check", section: "tube_jaune" },
    "check_DHEAS": { x: COL2_X, y: jauneY(6), label: "DHEAS", type: "check", section: "tube_jaune" },
    "check_DFG": { x: COL2_X, y: jauneY(7), label: "DFG", type: "check", section: "tube_jaune" },
    "check_Estradiol": { x: COL2_X, y: jauneY(10), label: "Estradiol", type: "check", section: "tube_jaune" },
    "check_Fer serique": { x: COL2_X, y: jauneY(11), label: "Fer sérique", type: "check", section: "tube_jaune" },
    "check_Ferritine": { x: COL2_X, y: jauneY(12), label: "Ferritine", type: "check", section: "tube_jaune" },
    "check_Folates seriques": { x: COL2_X, y: jauneY(13), label: "Folates", type: "check", section: "tube_jaune" },
    "check_Fructosamine": { x: COL2_X, y: jauneY(15), label: "Fructosamine", type: "check", section: "tube_jaune" },
    "check_GGT": { x: COL2_X, y: jauneY(16), label: "GGT", type: "check", section: "tube_jaune" },

    // ---- TUBE JAUNE Col 3 ----
    "check_Hepatite A / B / C": { x: COL3_X, y: jauneY(0), label: "Hépatite ABC", type: "check", section: "tube_jaune" },
    "check_HIV": { x: COL3_X, y: jauneY(1), label: "HIV", type: "check", section: "tube_jaune" },
    "check_HTLV": { x: COL3_X, y: jauneY(2), label: "HTLV", type: "check", section: "tube_jaune" },
    "check_IgA / IgG / IgM / IgE totales": { x: COL3_X, y: jauneY(3), label: "Ig totales", type: "check", section: "tube_jaune" },
    "check_Ionogramme complet": { x: COL3_X, y: jauneY(4), label: "Ionogramme", type: "check", section: "tube_jaune" },
    "check_LDH": { x: COL3_X, y: jauneY(6), label: "LDH", type: "check", section: "tube_jaune" },
    "check_Lipase": { x: COL3_X, y: jauneY(7), label: "Lipase", type: "check", section: "tube_jaune" },
    "check_Magnesium": { x: COL3_X, y: jauneY(8), label: "Magnésium", type: "check", section: "tube_jaune" },
    "check_Na / K / Cl": { x: COL3_X, y: jauneY(9), label: "Na/K/Cl", type: "check", section: "tube_jaune" },
    "check_PAL": { x: COL3_X, y: jauneY(10), label: "PAL", type: "check", section: "tube_jaune" },
    "check_Phosphore": { x: COL3_X, y: jauneY(11), label: "Phosphore", type: "check", section: "tube_jaune" },
    "check_Prealbumine": { x: COL3_X, y: jauneY(12), label: "Préalbumine", type: "check", section: "tube_jaune" },
    "check_Progesterone": { x: COL3_X, y: jauneY(13), label: "Progestérone", type: "check", section: "tube_jaune" },
    "check_Prolactine": { x: COL3_X, y: jauneY(14), label: "Prolactine", type: "check", section: "tube_jaune" },
    "check_Protides": { x: COL3_X, y: jauneY(15), label: "Protides", type: "check", section: "tube_jaune" },

    // ---- TUBE JAUNE Col 4 ----
    "check_PSA / PSA LIBRE": { x: COL4_X, y: jauneY(0), label: "PSA", type: "check", section: "tube_jaune" },
    "check_PTH": { x: COL4_X, y: jauneY(1), label: "PTH", type: "check", section: "tube_jaune" },
    "check_Rubeole": { x: COL4_X, y: jauneY(2), label: "Rubéole", type: "check", section: "tube_jaune" },
    "check_Syphilis": { x: COL4_X, y: jauneY(3), label: "Syphilis", type: "check", section: "tube_jaune" },
    "check_T3L / T4L": { x: COL4_X, y: jauneY(4), label: "T3L/T4L", type: "check", section: "tube_jaune" },
    "check_Testosterone": { x: COL4_X, y: jauneY(5), label: "Testostérone", type: "check", section: "tube_jaune" },
    "check_Toxoplasmose": { x: COL4_X, y: jauneY(6), label: "Toxoplasmose", type: "check", section: "tube_jaune" },
    "check_TSH": { x: COL4_X, y: jauneY(7), label: "TSH", type: "check", section: "tube_jaune" },
    "check_Uree": { x: COL4_X, y: jauneY(8), label: "Urée", type: "check", section: "tube_jaune" },
    "check_Vit B12": { x: COL4_X, y: jauneY(9), label: "Vit B12", type: "check", section: "tube_jaune" },
    "check_Vit D": { x: COL4_X, y: jauneY(10), label: "Vit D", type: "check", section: "tube_jaune" },

    // ---- CARDIAQUES ----
    "check_NTproBNP": { x: 18, y: 590, label: "NTproBNP", type: "check", section: "cardiaques" },
    "check_Troponine": { x: 88, y: 590, label: "Troponine", type: "check", section: "cardiaques" },
    "check_Electrophorese des protides / Immunotypage": { x: 20, y: 608, label: "Electrophorèse prot.", type: "check", section: "cardiaques" },

    // ---- RHUMATO ----
    "check_ENA / AAN / ACADN": { x: 18, y: 635, label: "ENA/AAN/ACADN", type: "check", section: "rhumato" },
    "check_Facteurs rhumatoides": { x: 160, y: 635, label: "Fact. rhumatoïdes", type: "check", section: "rhumato" },

    // ---- SEROLOGIES ----
    "check_Serologie H.Pylori": { x: 22, y: 675, label: "Séro. H.Pylori", type: "check", section: "serologies" },
    "check_Serologie C.trachomatis IgG": { x: 22, y: 675, label: "Séro. C.trachomatis", type: "check", section: "serologies" },
    "check_Procalcitonie": { x: 320, y: 675, label: "Procalcitonie", type: "check", section: "serologies" },

    // ---- CHLORDECONE ----
    "check_Chlordecone": { x: 20, y: 692, label: "Chlordécone", type: "check", section: "chlordecone" },

    // ---- TUBE VERT ----
    "check_Bicarbonates / Reserve alcaline": { x: 465, y: 692, label: "Bicarb/Rés. alc.", type: "check", section: "tube_vert" },

    // ---- TUBE VIOLET ----
    "check_NFS": { x: 18, y: 730, label: "NFS", type: "check", section: "tube_violet" },
    "check_VS": { x: 58, y: 730, label: "VS", type: "check", section: "tube_violet" },
    "check_Reticulocytes": { x: 103, y: 730, label: "Réticulocytes", type: "check", section: "tube_violet" },
    "check_BNP": { x: 218, y: 730, label: "BNP", type: "check", section: "tube_violet" },
    "check_HbA1C": { x: 398, y: 730, label: "HbA1C", type: "check", section: "tube_violet" },
    "check_Plaquettes": { x: 18, y: 742, label: "Plaquettes", type: "check", section: "tube_violet" },
    "check_Electrophorese HB": { x: 20, y: 755, label: "Electrophorèse HB", type: "check", section: "tube_violet" },
    "check_RAI": { x: 18, y: 787, label: "RAI", type: "check", section: "tube_violet" },
    "check_Groupe sanguin": { x: 185, y: 787, label: "Groupe sanguin", type: "check", section: "tube_violet" },

    // ---- TUBE GRIS ----
    "check_Glycemie a Jeun": { x: 490, y: 730, label: "Glycémie à jeun", type: "check", section: "tube_gris" },
    "check_GPP": { x: 490, y: 742, label: "GPP", type: "check", section: "tube_gris" },
  };
}

// ---- Sections for grouped display in the editor ----
export const CALIBRATION_SECTIONS = [
  { id: "header", label: "En-tête", color: "#6366F1" },
  { id: "ide", label: "Préleveur (IDE)", color: "#06B6D4" },
  { id: "patient", label: "Patient", color: "#10B981" },
  { id: "clinique", label: "Renseignements cliniques", color: "#F59E0B" },
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
];

// ---- In-memory store (singleton) ----
let _calibration: CalibrationMap = getDefaultCalibration();
let _listeners: Array<() => void> = [];

export function getCalibration(): CalibrationMap {
  return _calibration;
}

export function setCalibration(cal: CalibrationMap) {
  _calibration = { ...cal };
  _listeners.forEach((fn) => fn());
}

export function updateFieldCoord(key: string, x: number, y: number) {
  if (_calibration[key]) {
    _calibration = { ..._calibration, [key]: { ..._calibration[key], x, y } };
    _listeners.forEach((fn) => fn());
  }
}

export function resetCalibration() {
  _calibration = getDefaultCalibration();
  _listeners.forEach((fn) => fn());
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
    // Validate shape: every value must have x, y, label, type, section
    for (const key of Object.keys(parsed)) {
      const v = parsed[key];
      if (typeof v.x !== "number" || typeof v.y !== "number" || !v.label || !v.type || !v.section) {
        return false;
      }
    }
    setCalibration(parsed);
    return true;
  } catch {
    return false;
  }
}

// ---- React hook ----
import { useState as useReactState, useEffect as useReactEffect, useSyncExternalStore } from "react";

export function useCalibration(): CalibrationMap {
  return useSyncExternalStore(subscribeCalibration, getCalibration);
}
