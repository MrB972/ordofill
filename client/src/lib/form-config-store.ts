/**
 * Form Config Store — Configurateur de Formulaire
 * 
 * Stores the form layout configuration: sections and their fields.
 * Syncs with calibration store — when fields are added/removed here,
 * they are automatically added/removed from calibration.
 * Persists via Supabase (stored in calibration_defaults.calibration_data under __form_config__ key).
 */

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import {
  getCalibration,
  addField as calAddField,
  deleteField as calDeleteField,
  renameField as calRenameField,
  setCalibration,
  saveCalibrationToSupabase,
  type FieldCoord,
  type CalibrationMap,
} from "./calibration-store";

// ---- Types ----

export type FormFieldType = "check" | "text" | "date" | "combo" | "combo_date";

export interface FormField {
  id: string;
  calibrationKey: string;
  label: string;
  type: FormFieldType;
  visible: boolean;
  order: number;
}

export interface FormSection {
  id: string;
  label: string;
  page: 1 | 2;
  color: string;
  icon: string;
  visible: boolean;
  order: number;
  type: "tube" | "static" | "custom";
  fields: FormField[];
}

export interface FormConfig {
  version: number;
  sections: FormSection[];
}

// ---- Default Config ----

/** Build the default form config from the known sections */
export function getDefaultFormConfig(): FormConfig {
  const sections: FormSection[] = [
    // Page 1 — static sections
    { id: "header", label: "En-tête / Prescription", page: 1, color: "#6366F1", icon: "📋", visible: true, order: 0, type: "static", fields: [] },
    { id: "ide", label: "Préleveur (IDE)", page: 1, color: "#06B6D4", icon: "🩺", visible: true, order: 1, type: "static", fields: [] },
    { id: "patient", label: "Patient", page: 1, color: "#10B981", icon: "👤", visible: true, order: 2, type: "static", fields: [] },
    { id: "clinique", label: "Renseignements cliniques", page: 1, color: "#F59E0B", icon: "📝", visible: true, order: 3, type: "static", fields: [] },
    { id: "prelevement_p1", label: "Prélèvement", page: 1, color: "#14B8A6", icon: "💉", visible: true, order: 4, type: "static", fields: [] },
    { id: "anticoagulant", label: "Anticoagulant", page: 1, color: "#EF4444", icon: "💊", visible: true, order: 5, type: "static", fields: [] },
    // Page 1 — tube/analysis sections
    { id: "tube_bleu", label: "Tube bleu (citrate)", page: 1, color: "#3B82F6", icon: "🔵", visible: true, order: 6, type: "tube", fields: buildTubeFields("tube_bleu") },
    { id: "tube_jaune", label: "Tube jaune 5mL", page: 1, color: "#EAB308", icon: "🟡", visible: true, order: 7, type: "tube", fields: buildTubeFields("tube_jaune") },
    { id: "cardiaques", label: "Analyses cardiaques", page: 1, color: "#F43F5E", icon: "❤️", visible: true, order: 8, type: "tube", fields: buildTubeFields("cardiaques") },
    { id: "rhumato", label: "Rhumato (jaune 3.5mL)", page: 1, color: "#F97316", icon: "🟠", visible: true, order: 9, type: "tube", fields: buildTubeFields("rhumato") },
    { id: "serologies", label: "Sérologies", page: 1, color: "#A855F7", icon: "🟣", visible: true, order: 10, type: "tube", fields: buildTubeFields("serologies") },
    { id: "chlordecone", label: "Chlordécone", page: 1, color: "#DC2626", icon: "🔴", visible: true, order: 11, type: "tube", fields: buildTubeFields("chlordecone") },
    { id: "tube_vert", label: "Tube vert", page: 1, color: "#22C55E", icon: "🟢", visible: true, order: 12, type: "tube", fields: buildTubeFields("tube_vert") },
    { id: "tube_violet", label: "Tube violet EDTA", page: 1, color: "#8B5CF6", icon: "🟣", visible: true, order: 13, type: "tube", fields: buildTubeFields("tube_violet") },
    { id: "tube_gris", label: "Tube gris", page: 1, color: "#6B7280", icon: "⚪", visible: true, order: 14, type: "tube", fields: buildTubeFields("tube_gris") },
    // Page 2 — static sections
    { id: "p2_rc_urinaires", label: "Rens. cliniques urinaires", page: 2, color: "#F59E0B", icon: "🧪", visible: true, order: 15, type: "static", fields: buildP2Fields("p2_rc_urinaires") },
    { id: "p2_biochimie_urinaire", label: "Biochimie urinaire", page: 2, color: "#F97316", icon: "🔬", visible: true, order: 16, type: "static", fields: buildP2Fields("p2_biochimie_urinaire") },
    { id: "p2_ecbu", label: "ECBU", page: 2, color: "#06B6D4", icon: "🫗", visible: true, order: 17, type: "static", fields: buildP2Fields("p2_ecbu") },
    { id: "p2_rc_ecbu", label: "Rens. cliniques ECBU", page: 2, color: "#EAB308", icon: "📋", visible: true, order: 18, type: "static", fields: buildP2Fields("p2_rc_ecbu") },
    { id: "p2_etat_physio", label: "État physiologique", page: 2, color: "#10B981", icon: "🫀", visible: true, order: 19, type: "static", fields: buildP2Fields("p2_etat_physio") },
    { id: "p2_plaie_pus", label: "Plaie / Pus", page: 2, color: "#EF4444", icon: "🩹", visible: true, order: 20, type: "static", fields: buildP2Fields("p2_plaie_pus") },
    { id: "p2_selles", label: "Selles", page: 2, color: "#A855F7", icon: "🧫", visible: true, order: 21, type: "static", fields: buildP2Fields("p2_selles") },
    { id: "p2_hemocultures", label: "Hémocultures", page: 2, color: "#F43F5E", icon: "🩸", visible: true, order: 22, type: "static", fields: buildP2Fields("p2_hemocultures") },
    { id: "p2_autres", label: "Autres prélèvements", page: 2, color: "#6B7280", icon: "📎", visible: true, order: 23, type: "static", fields: buildP2Fields("p2_autres") },
    { id: "p2_reception", label: "Réception laboratoire", page: 2, color: "#3B82F6", icon: "🏥", visible: true, order: 24, type: "static", fields: buildP2Fields("p2_reception") },
    { id: "p2_non_conformite", label: "Non-conformité", page: 2, color: "#DC2626", icon: "⚠️", visible: true, order: 25, type: "static", fields: buildP2Fields("p2_non_conformite") },
  ];
  return { version: 1, sections };
}

/** Build field list for a tube/analysis section from default calibration */
function buildTubeFields(sectionId: string): FormField[] {
  const cal = getCalibration();
  let order = 0;
  return Object.entries(cal)
    .filter(([key, f]) => f.section === sectionId && key.startsWith("check_"))
    .map(([key, f]) => ({
      id: key.replace(/^check_/, ""),
      calibrationKey: key,
      label: f.label,
      type: "check" as FormFieldType,
      visible: true,
      order: order++,
    }));
}

/** Build field list for a Page 2 section from default calibration */
function buildP2Fields(sectionId: string): FormField[] {
  const cal = getCalibration();
  let order = 0;
  return Object.entries(cal)
    .filter(([, f]) => f.section === sectionId)
    .map(([key, f]) => ({
      id: key,
      calibrationKey: key,
      label: f.label,
      type: f.type as FormFieldType,
      visible: true,
      order: order++,
    }));
}

// ---- In-memory store ----

let _formConfig: FormConfig = getDefaultFormConfig();
let _listeners: Array<() => void> = [];

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function getFormConfig(): FormConfig {
  return _formConfig;
}

export function setFormConfig(config: FormConfig) {
  _formConfig = { ...config };
  _notify();
}

export function subscribeFormConfig(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

// ---- React hook ----
export function useFormConfig(): FormConfig {
  return useSyncExternalStore(subscribeFormConfig, getFormConfig);
}

// ---- Section CRUD ----

export function addSection(section: FormSection) {
  _formConfig = {
    ..._formConfig,
    sections: [..._formConfig.sections, section],
  };
  _notify();
}

export function deleteSection(sectionId: string) {
  const section = _formConfig.sections.find((s) => s.id === sectionId);
  if (section) {
    // Also delete all fields from calibration
    for (const field of section.fields) {
      calDeleteField(field.calibrationKey);
    }
  }
  _formConfig = {
    ..._formConfig,
    sections: _formConfig.sections.filter((s) => s.id !== sectionId),
  };
  _notify();
}

export function updateSection(sectionId: string, updates: Partial<FormSection>) {
  _formConfig = {
    ..._formConfig,
    sections: _formConfig.sections.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    ),
  };
  _notify();
}

export function reorderSections(sectionIds: string[]) {
  const sectionMap = new Map(_formConfig.sections.map((s) => [s.id, s]));
  const reordered = sectionIds
    .map((id, idx) => {
      const s = sectionMap.get(id);
      return s ? { ...s, order: idx } : null;
    })
    .filter(Boolean) as FormSection[];
  // Add any sections not in the reorder list
  for (const s of _formConfig.sections) {
    if (!sectionIds.includes(s.id)) {
      reordered.push(s);
    }
  }
  _formConfig = { ..._formConfig, sections: reordered };
  _notify();
}

// ---- Field CRUD ----

export function addFieldToSection(sectionId: string, field: FormField) {
  // Add to form config
  _formConfig = {
    ..._formConfig,
    sections: _formConfig.sections.map((s) =>
      s.id === sectionId
        ? { ...s, fields: [...s.fields, field] }
        : s
    ),
  };
  
  // Also add to calibration store
  const section = _formConfig.sections.find((s) => s.id === sectionId);
  if (section) {
    const calType = field.type === "date" ? "text" : field.type;
    const calField: FieldCoord = {
      x: 20,
      y: 100,
      label: field.label,
      type: calType as FieldCoord["type"],
      section: sectionId,
      fontSize: 8,
      wordSpacing: 0,
    };
    calAddField(field.calibrationKey, calField);
  }
  
  _notify();
}

export function deleteFieldFromSection(sectionId: string, fieldId: string) {
  const section = _formConfig.sections.find((s) => s.id === sectionId);
  const field = section?.fields.find((f) => f.id === fieldId);
  
  if (field) {
    // Remove from calibration
    calDeleteField(field.calibrationKey);
  }
  
  _formConfig = {
    ..._formConfig,
    sections: _formConfig.sections.map((s) =>
      s.id === sectionId
        ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
        : s
    ),
  };
  _notify();
}

export function updateFieldInSection(sectionId: string, fieldId: string, updates: Partial<FormField>) {
  _formConfig = {
    ..._formConfig,
    sections: _formConfig.sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            fields: s.fields.map((f) =>
              f.id === fieldId ? { ...f, ...updates } : f
            ),
          }
        : s
    ),
  };
  
  // If label changed, sync to calibration
  if (updates.label) {
    const section = _formConfig.sections.find((s) => s.id === sectionId);
    const field = section?.fields.find((f) => f.id === fieldId);
    if (field) {
      calRenameField(field.calibrationKey, updates.label);
    }
  }
  
  _notify();
}

// ---- Supabase persistence ----

const FORM_CONFIG_KEY = "__form_config__";

export async function saveFormConfigToSupabase(userId: string): Promise<boolean> {
  try {
    // Load current calibration data
    const { data: existing } = await supabase
      .from("calibration_defaults")
      .select("calibration_data")
      .eq("user_id", userId)
      .single();
    
    const calData = (existing?.calibration_data ?? {}) as Record<string, unknown>;
    calData[FORM_CONFIG_KEY] = _formConfig;
    
    const { error } = await supabase
      .from("calibration_defaults")
      .upsert(
        { user_id: userId, calibration_data: calData, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    
    if (error) {
      console.error("Form config save error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Form config save error:", err);
    return false;
  }
}

export async function loadFormConfigFromSupabase(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("calibration_defaults")
      .select("calibration_data")
      .eq("user_id", userId)
      .single();
    
    if (error || !data?.calibration_data) return false;
    
    const calData = data.calibration_data as Record<string, unknown>;
    const formConfig = calData[FORM_CONFIG_KEY] as FormConfig | undefined;
    
    if (formConfig && formConfig.version && formConfig.sections) {
      setFormConfig(formConfig);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/** Generate a unique ID for new sections/fields */
export function generateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
