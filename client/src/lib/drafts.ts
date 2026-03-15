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

  // Page 1 enrichments — Patient
  nomNaissanceVal?: string;
  lieuNaissance?: string;
  etablissementSoins?: string;
  demandeEtiquettes?: string;

  // Page 1 enrichments — Clinique
  pathologieConnue?: boolean;
  pathologieConnueTexte?: string;
  cliniqueChimiotherapie?: boolean;
  cliniqueAntibiotherapie?: boolean;
  cliniqueDialyse?: boolean;
  cliniqueSuiviHemopathie?: boolean;
  cliniqueTraitementEPO?: boolean;
  cliniqueTransfusion4mois?: boolean;
  cliniqueInjectionRhophylac?: boolean;
  cliniqueRhophylacDate?: string;
  cliniqueMedicamentsDateHeure?: string;
  cliniqueDateDernieresRegles?: string;
  cliniqueAutres?: string;

  // Page 1 enrichments — Prélèvement
  sansGarrot?: boolean;
  veinesDifficiles?: boolean;
  prelevementAutres?: string;
  nbTubesBleu?: string;
  nbTubesJaune?: string;
  nbTubesViolet?: string;
  nbTubesGris?: string;

  // Tube Gris GPP enrichment
  gppHeure?: string;
  gppApresDejeuner?: boolean;
  gppApresPetitDejeuner?: boolean;

  // Page 2 — Renseignements cliniques urinaires
  p2_antibio?: string;
  p2_chimiotherapie?: boolean;
  p2_fievreUrines?: boolean;
  p2_grossesseUrines?: boolean;
  p2_autreRcUrinaire?: string;

  // Page 2 — Biochimie urinaire
  p2_24h?: boolean;
  p2_24h_dateDebut?: string;
  p2_24h_dateFin?: string;
  p2_diurese?: string;
  p2_echantillon?: boolean;
  p2_proteinurie?: boolean;
  p2_glycosurie?: boolean;
  p2_microAlbuminurie?: boolean;
  p2_ionoUrinaire?: boolean;
  p2_ureeUrinaire?: boolean;
  p2_acUriqueUrinaire?: boolean;
  p2_creatinineUrinaire?: boolean;
  p2_calciumUrinaire?: boolean;
  p2_phosphoreUrinaire?: boolean;
  p2_biochimieAutre?: boolean;
  p2_biochimieAutreTexte?: string;

  // Page 2 — ECBU
  p2_ecbu_date?: string;
  p2_ecbu_heure?: string;
  p2_2emeJet?: boolean;
  p2_surSonde?: boolean;
  p2_surSondeType?: string;
  p2_apresChangementSonde?: boolean;
  p2_sondage?: boolean;
  p2_collecteurBebe?: boolean;
  p2_collecteurPenien?: boolean;
  p2_ecbuAutre?: string;

  // Page 2 — Renseignements cliniques ECBU
  p2_fievreEcbu?: boolean;
  p2_douleursPubiennes?: boolean;
  p2_brulure?: boolean;
  p2_douleursMictionnelles?: boolean;
  p2_pollakiurie?: boolean;
  p2_ecoulement?: boolean;
  p2_douleursLombaires?: boolean;
  p2_hematurieMacro?: boolean;
  p2_autreMotifEcbu?: string;
  p2_mictionsImperieuses?: boolean;
  p2_absenceSignes?: boolean;
  p2_dysurie?: boolean;

  // Page 2 — État physiologique
  p2_grossesseEtat?: boolean;
  p2_bilanPreop?: boolean;
  p2_chimiotherapieEtat?: boolean;
  p2_greffe?: boolean;
  p2_dialyse?: boolean;
  p2_hospiRecente?: boolean;
  p2_antibio7j?: boolean;
  p2_antibioLequel?: string;

  // Page 2 — Plaie / Pus
  p2_plaie_date?: string;
  p2_plaie_heure?: string;
  p2_plaie_aspect?: string;
  p2_plaie_localisation?: string;
  p2_plaie_contexte?: string;

  // Page 2 — Selles
  p2_coproculture?: boolean;
  p2_parasitologie?: boolean;
  p2_sangSelles?: boolean;
  p2_selles_date?: string;
  p2_selles_heure?: string;
  p2_diarrhees?: boolean;
  p2_douleursIntestinales?: boolean;
  p2_constipation?: boolean;
  p2_sellesAutre?: string;
  p2_voyageZone?: string;
  p2_medecineTravail?: boolean;

  // Page 2 — Hémocultures
  p2_H1?: boolean;
  p2_H2?: boolean;
  p2_H3?: boolean;
  p2_prelevPeripherique?: boolean;
  p2_prelevCatheter?: boolean;
  p2_hemo_date?: string;
  p2_hemo_heure?: string;
  p2_fievreTemp?: string;
  p2_suspicionEndocardite?: boolean;

  // Page 2 — Autres
  p2_autres_date?: string;
  p2_autres_heure?: string;
  p2_autres_nature?: string;
  p2_autres_localisation?: string;
  p2_autres_contexte?: string;

  // Page 2 — Réception laboratoire
  p2_secretaire?: string;
  p2_technicien?: string;
  p2_reception_date?: string;
  p2_reception_heure?: string;

  // Page 2 — Non-conformité
  p2_nc_identPrelevement?: boolean;
  p2_nc_ordonnance?: boolean;
  p2_nc_tubesTrop?: boolean;
  p2_nc_tubesManquants?: boolean;
  p2_nc_caillotHemolyse?: boolean;
  p2_nc_tubesPerimes?: boolean;
  p2_nc_identPatient?: boolean;
  p2_nc_prelevHeure?: boolean;
  p2_nc_delai?: boolean;
  p2_nc_delaiDerogation?: boolean;
  p2_nc_renseignementsCliniques?: boolean;
  p2_nc_autre?: string;

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
