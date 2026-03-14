// Draft system for Fiche Labo — persists to localStorage

export interface FicheDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  patientName: string; // display label
  data: FicheDraftData;
}

export interface FicheDraftData {
  // Patient identity
  nomUsuel: string;
  prenoms: string;
  dateNaissance: string;
  adresse: string;
  sexe: string;
  telephone: string;
  numSecu: string;
  medecinTraitant: string;
  prescripteur: string;
  mutuelle: string;
  finDeDroit: string;
  // Résultats
  resMedFaxer: boolean;
  resMedTelephoner: boolean;
  resMedPoster: boolean;
  resIdeTelephoner: boolean;
  resIdeSms: boolean;
  resPatLabo: boolean;
  resPatInternet: boolean;
  resPatSms: boolean;
  resPatOppose: boolean;
  controleDemande: boolean;
  // Pièce justificative
  pieceCni: boolean;
  piecePasseport: boolean;
  pieceTitre: boolean;
  // Prelevement
  datePrelevement: string;
  heurePrelevement: string;
  grossesse: boolean;
  fievre: boolean;
  traitements: string;
  urgent: boolean;
  // Prescription
  renouvelable: boolean;
  dateRenouvelable: string;
  // Anticoagulant
  selectedAnticoagulant: string;
  posologie: string;
  inrCible: string;
  // Analyses
  selectedAnalyses: string[];
  // Custom fields from calibration
  customFieldValues?: Record<string, string>;
  // Source info
  patientSource: "ordofill" | "ordocal";
  patientId: string | null;
}

const STORAGE_KEY = "ordofill_drafts";

function readDrafts(): FicheDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: FicheDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function getDrafts(): FicheDraft[] {
  return readDrafts().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveDraft(draft: FicheDraft): void {
  const drafts = readDrafts();
  const idx = drafts.findIndex((d) => d.id === draft.id);
  draft.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    drafts[idx] = draft;
  } else {
    drafts.push(draft);
  }
  writeDrafts(drafts);
}

export function deleteDraft(id: string): void {
  const drafts = readDrafts().filter((d) => d.id !== id);
  writeDrafts(drafts);
}

export function createNewDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
