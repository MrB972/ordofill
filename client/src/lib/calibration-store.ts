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
  type: "check" | "text" | "combo";
  section: string;
  /** Font size in PDF points. Default: 8 for text, 8 for checks */
  fontSize: number;
  /** Extra spacing in points between words (separators: space, /, -, .). 0 = normal */
  wordSpacing: number;
  /** For combo fields: order of check(X) and text. Default: "check_text" (X → Texte) */
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

    // ============ CHECKBOXES ============
    "check_urgent": c(492, 102, "Urgent", "header"),
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
    "check_Facteurs rhumatoides": c(160, 635, "Fact. rhumatoïdes", "rhumato"),

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
