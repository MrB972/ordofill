/**
 * Preview Data Store — provides form data for calibration preview mode.
 * 
 * The calibration page can show either field labels OR the actual data
 * that would appear on the PDF. This store holds the last form data 
 * entered in fiche-labo, OR falls back to sample data for preview.
 */

import { useSyncExternalStore } from "react";

export interface PreviewFormData {
  // IDE
  ideName: string;
  ideCabinet: string;
  // Patient
  nomUsuel: string;
  prenoms: string;
  dateNaissance: string;
  sexe: string;
  adresse: string;
  telephone: string;
  numSecu: string;
  medecinTraitant: string;
  prescripteur: string;
  mutuelle: string;
  finDeDroit: string;
  // Prelevement
  datePrelevement: string;
  heurePrelevement: string;
  // Clinique
  grossesse: boolean;
  fievre: boolean;
  traitements: string;
  urgent: boolean;
  // Anticoagulant
  anticoagulant: string;
  posologie: string;
  inrCible: string;
  // Analyses — set of check keys that are ticked
  selectedChecks: Set<string>;
  // Custom fields from calibration (key → value)
  customFieldValues: Record<string, string>;
}

/** Sample data used when no form data has been entered */
export function getSamplePreviewData(): PreviewFormData {
  return {
    ideName: "MIREDIN Norella",
    ideCabinet: "Cabinet Infirmier",
    nomUsuel: "DUPONT",
    prenoms: "Marie-Claire",
    dateNaissance: "15/06/1985",
    sexe: "F",
    adresse: "12 rue des Palmiers, 97200 Fort-de-France",
    telephone: "0696 78 90 12",
    numSecu: "2 85 06 972 123 456 78",
    medecinTraitant: "Dr. JEAN-LOUIS",
    prescripteur: "Dr. JEAN-LOUIS",
    mutuelle: "MGEN",
    finDeDroit: "31/12/2026",
    datePrelevement: "14/03/2026",
    heurePrelevement: "07:30",
    grossesse: false,
    fievre: true,
    traitements: "Doliprane 1g, Kardegic 75mg, Metformine 500mg",
    urgent: true,
    anticoagulant: "Previscan",
    posologie: "1cp/j",
    inrCible: "2-3",
    selectedChecks: new Set([
      "check_INR", "check_TCA", "check_TP", "check_Ddimeres",
      "check_Creatinine", "check_CRP / CRP us", "check_Ionogramme complet",
      "check_TSH", "check_Ferritine", "check_Bilan hepatique", "check_GGT",
      "check_ALAT / ASAT", "check_Vit D",
      "check_NTproBNP", "check_Troponine",
      "check_NFS", "check_VS", "check_Plaquettes", "check_HbA1C",
      "check_Glycemie a Jeun",
      "check_Previscan", "check_inr23",
      "check_urgent", "check_fievre",
    ]),
    customFieldValues: {},
  };
}

// ---- In-memory store ----
let _previewData: PreviewFormData = getSamplePreviewData();
let _listeners: Array<() => void> = [];

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function getPreviewData(): PreviewFormData {
  return _previewData;
}

export function setPreviewData(data: PreviewFormData) {
  _previewData = data;
  _notify();
}

/** Update preview data from fiche-labo form fields */
export function updatePreviewFromForm(formData: Partial<PreviewFormData>) {
  _previewData = { ..._previewData, ...formData };
  _notify();
}

export function subscribePreview(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

export function usePreviewData(): PreviewFormData {
  return useSyncExternalStore(subscribePreview, getPreviewData);
}

/**
 * Map a calibration field key to its preview text value.
 * Returns the text that should appear on the PDF for this field.
 * Returns null for check fields (they get an "X" instead).
 */
export function getPreviewValueForField(
  key: string,
  data: PreviewFormData
): { text: string; isCheck: boolean } | null {
  // Text fields
  const textMap: Record<string, string> = {
    text_prescripteur: data.prescripteur,
    text_medecinTraitant: data.medecinTraitant,
    text_ideName: data.ideName,
    text_ideCabinet: data.ideCabinet,
    text_datePrelevement: data.datePrelevement,
    text_heurePrelevement: data.heurePrelevement,
    text_nomUsuel: data.nomUsuel,
    text_nomNaissance: data.nomUsuel, // same on the form
    text_prenoms: data.prenoms,
    text_telephone: data.telephone,
    text_dateNaissance: data.dateNaissance,
    text_adresse: data.adresse,
    text_numSecu: data.numSecu,
    text_traitements: data.traitements,
    text_posologie: data.posologie,
    text_mutuelle: data.mutuelle,
    text_finDeDroit: data.finDeDroit,
  };

  if (key in textMap) {
    return { text: textMap[key], isCheck: false };
  }

  // Check fields — return "X" if this check is in the selected set
  if (key.startsWith("check_")) {
    // Special checks based on form data
    if (key === "check_urgent" && data.urgent) return { text: "X", isCheck: true };
    if (key === "check_grossesse" && data.grossesse) return { text: "X", isCheck: true };
    if (key === "check_fievre" && data.fievre) return { text: "X", isCheck: true };
    if (key === "check_sexeH" && data.sexe === "M") return { text: "X", isCheck: true };
    if (key === "check_sexeF" && data.sexe === "F") return { text: "X", isCheck: true };
    if (key === "check_inr23" && data.inrCible === "2-3") return { text: "X", isCheck: true };
    if (key === "check_inr345" && (data.inrCible === "3-4.5" || data.inrCible === "3-4,5")) return { text: "X", isCheck: true };

    // Anticoagulant check
    if (key === `check_${data.anticoagulant}`) return { text: "X", isCheck: true };

    // Analysis checks
    if (data.selectedChecks.has(key)) return { text: "X", isCheck: true };

    // Custom check fields — look in customFieldValues
    if (data.customFieldValues[key] === "true") return { text: "X", isCheck: true };

    // Not checked
    return null;
  }

  // Combo fields — stored with both text and check in customFieldValues
  // text part in customFieldValues[key], check part in customFieldValues[key + ":checked"]
  if (key.startsWith("combo_date_")) {
    let dateVal = data.customFieldValues[key] ?? "";
    // Convert yyyy-mm-dd → dd/mm/yyyy for display
    if (dateVal && dateVal.includes("-")) {
      const parts = dateVal.split("-");
      if (parts.length === 3) dateVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateVal ? { text: dateVal, isCheck: false } : null;
  }
  if (key.startsWith("combo_")) {
    const textVal = data.customFieldValues[key] ?? "";
    return textVal ? { text: textVal, isCheck: false } : null;
  }

  // Custom text fields — look in customFieldValues
  if (key in data.customFieldValues) {
    const val = data.customFieldValues[key];
    return val ? { text: val, isCheck: false } : null;
  }

  return null;
}
