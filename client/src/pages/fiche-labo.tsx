import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  UserCheck,
  Download,
  Printer,
  Stethoscope,
  FlaskConical,
  TestTubes,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  CalendarRange,
  Save,
  Trash2,
  FileText,
  Clock,
  X,
  Crosshair,
  Puzzle,
  Type,
  CheckSquare,
  CopyCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";
import { generateCerballiancePDF } from "@/lib/pdf-cerballiance";
import { setPreviewData, type PreviewFormData } from "@/lib/preview-data-store";
import { useCustomFields, useCalibration, type CalibrationMap } from "@/lib/calibration-store";
import { Link } from "wouter";
import {
  getDrafts,
  saveDraft,
  deleteDraft,
  createNewDraftId,
  type FicheDraft,
  type FicheDraftData,
} from "@/lib/drafts";
import type { Patient } from "@shared/schema";

// Unified patient shape for the form
interface UnifiedPatient {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  date_naissance: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  numero_securite_sociale: string | null;
  genre: string | null;
  medecin_traitant: string | null;
  notes: string | null;
  source: "ordofill" | "ordocal";
}

interface OrdocalPatient {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  date_naissance: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  numero_securite_sociale: string | null;
  genre: string | null;
  medecin_traitant: string | null;
  notes: string | null;
}

// Helper to format name: NOM Prénom
function formatName(lastName: string, firstName: string) {
  return `${(lastName ?? "").toUpperCase()} ${(firstName ?? "").charAt(0).toUpperCase() + (firstName ?? "").slice(1).toLowerCase()}`;
}

// Static section display config — analyses are derived dynamically from calibration
interface TubeSectionConfig {
  label: string;
  calibrationSectionId: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}

const TUBE_SECTION_CONFIGS: TubeSectionConfig[] = [
  { label: "Tube bleu (citrate)", calibrationSectionId: "tube_bleu", color: "#3B82F6", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-400", icon: "\u{1F535}" },
  { label: "Tube jaune 5mL", calibrationSectionId: "tube_jaune", color: "#EAB308", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", textColor: "text-yellow-400", icon: "\u{1F7E1}" },
  { label: "Tube jaune 3.5mL (rhumato)", calibrationSectionId: "rhumato", color: "#F59E0B", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", textColor: "text-amber-400", icon: "\u{1F7E0}" },
  { label: "S\u00e9rologies", calibrationSectionId: "serologies", color: "#A855F7", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", textColor: "text-purple-400", icon: "\u{1F7E3}" },
  { label: "Analyses cardiaques", calibrationSectionId: "cardiaques", color: "#EF4444", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-400", icon: "\u2764\ufe0f" },
  { label: "Tube violet EDTA", calibrationSectionId: "tube_violet", color: "#8B5CF6", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", textColor: "text-violet-400", icon: "\u{1F7E3}" },
  { label: "Tube gris", calibrationSectionId: "tube_gris", color: "#6B7280", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30", textColor: "text-gray-400", icon: "\u26aa" },
  { label: "Tube vert", calibrationSectionId: "tube_vert", color: "#22C55E", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", textColor: "text-green-400", icon: "\u{1F7E2}" },
  { label: "Tube rouge (Chlordecone)", calibrationSectionId: "chlordecone", color: "#DC2626", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-400", icon: "\u{1F534}" },
];

/** An analysis entry: internal key (for calibration mapping) + display label */
interface AnalysisEntry {
  /** Internal identifier = calibration key without "check_" prefix */
  id: string;
  /** Display label (from calibration field.label, user-editable) */
  label: string;
}

/**
 * Build analyses list for a section from calibration data.
 * Only includes "check_" fields from the given section.
 * Returns both the internal id (key minus "check_") and the display label.
 */
function getAnalysesFromCalibration(cal: CalibrationMap, sectionId: string): AnalysisEntry[] {
  return Object.entries(cal)
    .filter(([key, field]) => field.section === sectionId && field.type === "check" && key.startsWith("check_"))
    .map(([key, field]) => ({ id: key.replace(/^check_/, ""), label: field.label }));
}

interface TubeSection {
  label: string;
  calibrationSectionId: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  analyses: AnalysisEntry[];
  icon: string;
}

/** Anticoagulant entries derived from the 'anticoagulant' calibration section,
 *  excluding special keys (inr23, inr345). */
function getAnticoagulantsFromCalibration(cal: CalibrationMap): AnalysisEntry[] {
  return Object.entries(cal)
    .filter(([key, field]) =>
      field.section === "anticoagulant" &&
      field.type === "check" &&
      key.startsWith("check_") &&
      !key.startsWith("check_inr")
    )
    .map(([key, field]) => ({ id: key.replace(/^check_/, ""), label: field.label }));
}

export default function FicheLaboPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Draft management
  const [currentDraftId, setCurrentDraftId] = useState<string>(createNewDraftId());
  const [drafts, setDrafts] = useState<FicheDraft[]>(getDrafts());
  const [draftsOpen, setDraftsOpen] = useState(false);

  // Patient selection
  const [searchTerm, setSearchTerm] = useState("");
  const [patientSource, setPatientSource] = useState<"ordofill" | "ordocal">("ordofill");
  const [selectedPatient, setSelectedPatient] = useState<UnifiedPatient | null>(null);

  // Mobile view toggle
  const [mobileView, setMobileView] = useState<"patient" | "analyses" | "page2">("patient");

  // Form fields
  const [nomUsuel, setNomUsuel] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [sexe, setSexe] = useState("");
  const [telephone, setTelephone] = useState("");
  const [numSecu, setNumSecu] = useState("");
  const [medecinTraitant, setMedecinTraitant] = useState("");
  const [prescripteur, setPrescripteur] = useState("");
  const [mutuelle, setMutuelle] = useState("");
  const [finDeDroit, setFinDeDroit] = useState("");

  // Résultats
  const [resMedFaxer, setResMedFaxer] = useState(false);
  const [resMedTelephoner, setResMedTelephoner] = useState(false);
  const [resMedPoster, setResMedPoster] = useState(false);
  const [resIdeTelephoner, setResIdeTelephoner] = useState(false);
  const [resIdeSms, setResIdeSms] = useState(false);
  const [resPatLabo, setResPatLabo] = useState(false);
  const [resPatInternet, setResPatInternet] = useState(false);
  const [resPatSms, setResPatSms] = useState(false);
  const [resPatOppose, setResPatOppose] = useState(false);
  const [controleDemande, setControleDemande] = useState(false);

  // Pièce justificative
  const [pieceCni, setPieceCni] = useState(false);
  const [piecePasseport, setPiecePasseport] = useState(false);
  const [pieceTitre, setPieceTitre] = useState(false);

  // Prelevement
  const [datePrelevement, setDatePrelevement] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [heurePrelevement, setHeurePrelevement] = useState(
    new Date().toTimeString().slice(0, 5)
  );

  // Renseignements cliniques
  const [grossesse, setGrossesse] = useState(false);
  const [fievre, setFievre] = useState(false);
  const [traitements, setTraitements] = useState("");
  const [urgent, setUrgent] = useState(false);

  // Prescription
  const [renouvelable, setRenouvelable] = useState(false);
  const [dateRenouvelable, setDateRenouvelable] = useState("");

  // Anticoagulant
  const [selectedAnticoagulant, setSelectedAnticoagulant] = useState("");
  const [posologie, setPosologie] = useState("");
  const [inrCible, setInrCible] = useState("");

  // Analyses
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // Page 1 enrichments — Patient
  const [nomNaissanceVal, setNomNaissanceVal] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [etablissementSoins, setEtablissementSoins] = useState("");
  const [demandeEtiquettes, setDemandeEtiquettes] = useState("");

  // Page 1 enrichments — Clinique
  const [pathologieConnue, setPathologieConnue] = useState(false);
  const [pathologieConnueTexte, setPathologieConnueTexte] = useState("");
  const [cliniqueChimiotherapie, setCliniqueChimiotherapie] = useState(false);
  const [cliniqueAntibiotherapie, setCliniqueAntibiotherapie] = useState(false);
  const [cliniqueDialyse, setCliniqueDialyse] = useState(false);
  const [cliniqueSuiviHemopathie, setCliniqueSuiviHemopathie] = useState(false);
  const [cliniqueTraitementEPO, setCliniqueTraitementEPO] = useState(false);
  const [cliniqueTransfusion4mois, setCliniqueTransfusion4mois] = useState(false);
  const [cliniqueInjectionRhophylac, setCliniqueInjectionRhophylac] = useState(false);
  const [cliniqueRhophylacDate, setCliniqueRhophylacDate] = useState("");
  const [cliniqueMedicamentsDateHeure, setCliniqueMedicamentsDateHeure] = useState("");
  const [cliniqueDateDernieresRegles, setCliniqueDateDernieresRegles] = useState("");
  const [cliniqueAutres, setCliniqueAutres] = useState("");

  // Page 1 enrichments — Prélèvement
  const [sansGarrot, setSansGarrot] = useState(false);
  const [veinesDifficiles, setVeinesDifficiles] = useState(false);
  const [prelevementAutres, setPrelevementAutres] = useState("");
  const [nbTubesBleu, setNbTubesBleu] = useState("");
  const [nbTubesJaune, setNbTubesJaune] = useState("");
  const [nbTubesViolet, setNbTubesViolet] = useState("");
  const [nbTubesGris, setNbTubesGris] = useState("");

  // Tube Gris GPP enrichment
  const [gppHeure, setGppHeure] = useState("");
  const [gppApresDejeuner, setGppApresDejeuner] = useState(false);
  const [gppApresPetitDejeuner, setGppApresPetitDejeuner] = useState(false);

  // --- Page 2 state ---
  // Renseignements cliniques urinaires
  const [p2_antibio, setP2Antibio] = useState("");
  const [p2_chimiotherapie, setP2Chimiotherapie] = useState(false);
  const [p2_fievreUrines, setP2FievreUrines] = useState(false);
  const [p2_grossesseUrines, setP2GrossesseUrines] = useState(false);
  const [p2_autreRcUrinaire, setP2AutreRcUrinaire] = useState("");

  // Biochimie urinaire
  const [p2_24h, setP2_24h] = useState(false);
  const [p2_24h_dateDebut, setP2_24hDateDebut] = useState("");
  const [p2_24h_dateFin, setP2_24hDateFin] = useState("");
  const [p2_diurese, setP2Diurese] = useState("");
  const [p2_echantillon, setP2Echantillon] = useState(false);
  const [p2_proteinurie, setP2Proteinurie] = useState(false);
  const [p2_glycosurie, setP2Glycosurie] = useState(false);
  const [p2_microAlbuminurie, setP2MicroAlbuminurie] = useState(false);
  const [p2_ionoUrinaire, setP2IonoUrinaire] = useState(false);
  const [p2_ureeUrinaire, setP2UreeUrinaire] = useState(false);
  const [p2_acUriqueUrinaire, setP2AcUriqueUrinaire] = useState(false);
  const [p2_creatinineUrinaire, setP2CreatinineUrinaire] = useState(false);
  const [p2_calciumUrinaire, setP2CalciumUrinaire] = useState(false);
  const [p2_phosphoreUrinaire, setP2PhosphoreUrinaire] = useState(false);
  const [p2_biochimieAutre, setP2BiochimieAutre] = useState(false);
  const [p2_biochimieAutreTexte, setP2BiochimieAutreTexte] = useState("");

  // ECBU
  const [p2_ecbu_date, setP2EcbuDate] = useState("");
  const [p2_ecbu_heure, setP2EcbuHeure] = useState("");
  const [p2_2emeJet, setP2_2emeJet] = useState(false);
  const [p2_surSonde, setP2SurSonde] = useState(false);
  const [p2_surSondeType, setP2SurSondeType] = useState("");
  const [p2_apresChangementSonde, setP2ApresChangementSonde] = useState(false);
  const [p2_sondage, setP2Sondage] = useState(false);
  const [p2_collecteurBebe, setP2CollecteurBebe] = useState(false);
  const [p2_collecteurPenien, setP2CollecteurPenien] = useState(false);
  const [p2_ecbuAutre, setP2EcbuAutre] = useState("");

  // Renseignements cliniques ECBU
  const [p2_fievreEcbu, setP2FievreEcbu] = useState(false);
  const [p2_douleursPubiennes, setP2DouleursPubiennes] = useState(false);
  const [p2_brulure, setP2Brulure] = useState(false);
  const [p2_douleursMictionnelles, setP2DouleursMictionnelles] = useState(false);
  const [p2_pollakiurie, setP2Pollakiurie] = useState(false);
  const [p2_ecoulement, setP2Ecoulement] = useState(false);
  const [p2_douleursLombaires, setP2DouleursLombaires] = useState(false);
  const [p2_hematurieMacro, setP2HematurieMacro] = useState(false);
  const [p2_autreMotifEcbu, setP2AutreMotifEcbu] = useState("");
  const [p2_mictionsImperieuses, setP2MictionsImperieuses] = useState(false);
  const [p2_absenceSignes, setP2AbsenceSignes] = useState(false);
  const [p2_dysurie, setP2Dysurie] = useState(false);

  // État physiologique
  const [p2_grossesseEtat, setP2GrossesseEtat] = useState(false);
  const [p2_bilanPreop, setP2BilanPreop] = useState(false);
  const [p2_chimiotherapieEtat, setP2ChimiotherapieEtat] = useState(false);
  const [p2_greffe, setP2Greffe] = useState(false);
  const [p2_dialyse, setP2Dialyse] = useState(false);
  const [p2_hospiRecente, setP2HospiRecente] = useState(false);
  const [p2_antibio7j, setP2Antibio7j] = useState(false);
  const [p2_antibioLequel, setP2AntibioLequel] = useState("");

  // Plaie / Pus
  const [p2_plaie_date, setP2PlaieDate] = useState("");
  const [p2_plaie_heure, setP2PlaieHeure] = useState("");
  const [p2_plaie_aspect, setP2PlaieAspect] = useState("");
  const [p2_plaie_localisation, setP2PlaieLocalisation] = useState("");
  const [p2_plaie_contexte, setP2PlaieContexte] = useState("");

  // Selles
  const [p2_coproculture, setP2Coproculture] = useState(false);
  const [p2_parasitologie, setP2Parasitologie] = useState(false);
  const [p2_sangSelles, setP2SangSelles] = useState(false);
  const [p2_selles_date, setP2SellesDate] = useState("");
  const [p2_selles_heure, setP2SellesHeure] = useState("");
  const [p2_diarrhees, setP2Diarrhees] = useState(false);
  const [p2_douleursIntestinales, setP2DouleursIntestinales] = useState(false);
  const [p2_constipation, setP2Constipation] = useState(false);
  const [p2_sellesAutre, setP2SellesAutre] = useState("");
  const [p2_voyageZone, setP2VoyageZone] = useState("");
  const [p2_medecineTravail, setP2MedecineTravail] = useState(false);

  // Hémocultures
  const [p2_H1, setP2H1] = useState(false);
  const [p2_H2, setP2H2] = useState(false);
  const [p2_H3, setP2H3] = useState(false);
  const [p2_prelevPeripherique, setP2PrelevPeripherique] = useState(false);
  const [p2_prelevCatheter, setP2PrelevCatheter] = useState(false);
  const [p2_hemo_date, setP2HemoDate] = useState("");
  const [p2_hemo_heure, setP2HemoHeure] = useState("");
  const [p2_fievreTemp, setP2FievreTemp] = useState("");
  const [p2_suspicionEndocardite, setP2SuspicionEndocardite] = useState(false);

  // Autres
  const [p2_autres_date, setP2AutresDate] = useState("");
  const [p2_autres_heure, setP2AutresHeure] = useState("");
  const [p2_autres_nature, setP2AutresNature] = useState("");
  const [p2_autres_localisation, setP2AutresLocalisation] = useState("");
  const [p2_autres_contexte, setP2AutresContexte] = useState("");

  // Réception laboratoire
  const [p2_secretaire, setP2Secretaire] = useState("");
  const [p2_technicien, setP2Technicien] = useState("");
  const [p2_reception_date, setP2ReceptionDate] = useState("");
  const [p2_reception_heure, setP2ReceptionHeure] = useState("");

  // Non-conformité
  const [p2_nc_identPrelevement, setP2NcIdentPrelevement] = useState(false);
  const [p2_nc_ordonnance, setP2NcOrdonnance] = useState(false);
  const [p2_nc_tubesTrop, setP2NcTubesTrop] = useState(false);
  const [p2_nc_tubesManquants, setP2NcTubesManquants] = useState(false);
  const [p2_nc_caillotHemolyse, setP2NcCaillotHemolyse] = useState(false);
  const [p2_nc_tubesPerimes, setP2NcTubesPerimes] = useState(false);
  const [p2_nc_identPatient, setP2NcIdentPatient] = useState(false);
  const [p2_nc_prelevHeure, setP2NcPrelevHeure] = useState(false);
  const [p2_nc_delai, setP2NcDelai] = useState(false);
  const [p2_nc_delaiDerogation, setP2NcDelaiDerogation] = useState(false);
  const [p2_nc_renseignementsCliniques, setP2NcRenseignementsCliniques] = useState(false);
  const [p2_nc_autre, setP2NcAutre] = useState("");

  // Collapsed state for Page 2 sections (all collapsed by default)
  const [p2CollapsedSections, setP2CollapsedSections] = useState<Set<string>>(
    new Set(["p2_rc_urinaires", "p2_biochimie_urinaire", "p2_ecbu", "p2_rc_ecbu", "p2_etat_physio", "p2_plaie_pus", "p2_selles", "p2_hemocultures", "p2_autres", "p2_reception", "p2_non_conformite"])
  );

  const toggleP2Section = (sectionId: string) => {
    setP2CollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Calibration data (reactive)
  const calibration = useCalibration();

  // Custom fields from calibration
  const customFields = useCustomFields();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Build TUBE_SECTIONS dynamically from calibration
  const TUBE_SECTIONS: TubeSection[] = useMemo(() =>
    TUBE_SECTION_CONFIGS.map((cfg) => ({
      ...cfg,
      analyses: getAnalysesFromCalibration(calibration, cfg.calibrationSectionId),
    })).filter((s) => s.analyses.length > 0),
    [calibration]
  );

  // Build anticoagulants list dynamically from calibration
  const ANTICOAGULANTS = useMemo(() => getAnticoagulantsFromCalibration(calibration), [calibration]);

  // Sync form data to preview store (for calibration preview mode)
  useEffect(() => {
    // Only sync if there's some data entered
    if (!nomUsuel && !prenoms) return;
    const dn = dateNaissance;
    let formattedDN = dn;
    if (dn && dn.includes("-")) {
      const parts = dn.split("-");
      if (parts.length === 3) formattedDN = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const dp = datePrelevement;
    let formattedDP = dp;
    if (dp && dp.includes("-")) {
      const parts = dp.split("-");
      if (parts.length === 3) formattedDP = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const checkSet = new Set<string>();
    selectedAnalyses.forEach((a) => checkSet.add(`check_${a}`));
    if (urgent) checkSet.add("check_urgent");
    if (renouvelable) checkSet.add("check_renouvelable");
    if (grossesse) checkSet.add("check_grossesse");
    if (fievre) checkSet.add("check_fievre");
    if (sexe === "M") checkSet.add("check_sexeH");
    if (sexe === "F") checkSet.add("check_sexeF");
    if (selectedAnticoagulant) checkSet.add(`check_${selectedAnticoagulant}`);
    if (inrCible === "2-3") checkSet.add("check_inr23");
    if (inrCible === "3-4.5" || inrCible === "3-4,5") checkSet.add("check_inr345");
    // Résultats
    if (resMedFaxer) checkSet.add("check_à_Faxer");
    if (resMedTelephoner) checkSet.add("check_à_téléphoner");
    if (resMedPoster) checkSet.add("check_à_poster");
    if (resIdeTelephoner) checkSet.add("check_à_téléphoner_1");
    if (resIdeSms) checkSet.add("check_SMS_avec_consentement_patient");
    if (resPatLabo) checkSet.add("check_au_laboratoire");
    if (resPatInternet) checkSet.add("check_Internet");
    if (resPatSms) checkSet.add("check_SMS");
    if (resPatOppose) checkSet.add("check_Le_patient_soppose_à_la_communication_de_résultats_à_lIDE");
    if (controleDemande) checkSet.add("check_Contrôle_demandé");
    // Pièce justificative
    if (pieceCni) checkSet.add("check_CNI");
    if (piecePasseport) checkSet.add("check_Passeport");
    if (pieceTitre) checkSet.add("check_Titre_ou_carte_de_séjour");
    // Page 1 enrichments
    if (pathologieConnue) checkSet.add("check_pathologieConnue");
    if (cliniqueChimiotherapie) checkSet.add("check_chimiotherapie");
    if (cliniqueAntibiotherapie) checkSet.add("check_antibiotherapie");
    if (cliniqueDialyse) checkSet.add("check_dialyse");
    if (cliniqueSuiviHemopathie) checkSet.add("check_suiviHemopathie");
    if (cliniqueTraitementEPO) checkSet.add("check_traitementEPO");
    if (cliniqueTransfusion4mois) checkSet.add("check_transfusion4mois");
    if (cliniqueInjectionRhophylac) checkSet.add("check_injectionRhophylac");
    if (sansGarrot) checkSet.add("check_sansGarrot");
    if (veinesDifficiles) checkSet.add("check_veinesDifficiles");
    if (gppApresDejeuner) checkSet.add("check_GPP_apres_dejeuner");
    if (gppApresPetitDejeuner) checkSet.add("check_GPP_apres_petit_dejeuner");
    // Page 2 checks
    if (p2_chimiotherapie) checkSet.add("check_p2_chimiotherapie");
    if (p2_fievreUrines) checkSet.add("check_p2_fievreUrines");
    if (p2_grossesseUrines) checkSet.add("check_p2_grossesseUrines");
    if (p2_24h) checkSet.add("check_p2_24h");
    if (p2_echantillon) checkSet.add("check_p2_echantillon");
    if (p2_proteinurie) checkSet.add("check_p2_proteinurie");
    if (p2_glycosurie) checkSet.add("check_p2_glycosurie");
    if (p2_microAlbuminurie) checkSet.add("check_p2_microAlbuminurie");
    if (p2_ionoUrinaire) checkSet.add("check_p2_ionoUrinaire");
    if (p2_ureeUrinaire) checkSet.add("check_p2_ureeUrinaire");
    if (p2_acUriqueUrinaire) checkSet.add("check_p2_acUriqueUrinaire");
    if (p2_creatinineUrinaire) checkSet.add("check_p2_creatinineUrinaire");
    if (p2_calciumUrinaire) checkSet.add("check_p2_calciumUrinaire");
    if (p2_phosphoreUrinaire) checkSet.add("check_p2_phosphoreUrinaire");
    if (p2_biochimieAutre) checkSet.add("check_p2_biochimieAutre");
    if (p2_2emeJet) checkSet.add("check_p2_2emeJet");
    if (p2_surSonde) checkSet.add("check_p2_surSonde");
    if (p2_apresChangementSonde) checkSet.add("check_p2_apresChangementSonde");
    if (p2_sondage) checkSet.add("check_p2_sondage");
    if (p2_collecteurBebe) checkSet.add("check_p2_collecteurBebe");
    if (p2_collecteurPenien) checkSet.add("check_p2_collecteurPenien");
    if (p2_fievreEcbu) checkSet.add("check_p2_fievreEcbu");
    if (p2_douleursPubiennes) checkSet.add("check_p2_douleursPubiennes");
    if (p2_brulure) checkSet.add("check_p2_brulure");
    if (p2_douleursMictionnelles) checkSet.add("check_p2_douleursMictionnelles");
    if (p2_pollakiurie) checkSet.add("check_p2_pollakiurie");
    if (p2_ecoulement) checkSet.add("check_p2_ecoulement");
    if (p2_douleursLombaires) checkSet.add("check_p2_douleursLombaires");
    if (p2_hematurieMacro) checkSet.add("check_p2_hematurieMacro");
    if (p2_mictionsImperieuses) checkSet.add("check_p2_mictionsImperieuses");
    if (p2_absenceSignes) checkSet.add("check_p2_absenceSignes");
    if (p2_dysurie) checkSet.add("check_p2_dysurie");
    if (p2_grossesseEtat) checkSet.add("check_p2_grossesseEtat");
    if (p2_bilanPreop) checkSet.add("check_p2_bilanPreop");
    if (p2_chimiotherapieEtat) checkSet.add("check_p2_chimiotherapieEtat");
    if (p2_greffe) checkSet.add("check_p2_greffe");
    if (p2_dialyse) checkSet.add("check_p2_dialyse");
    if (p2_hospiRecente) checkSet.add("check_p2_hospiRecente");
    if (p2_antibio7j) checkSet.add("check_p2_antibio7j");
    if (p2_coproculture) checkSet.add("check_p2_coproculture");
    if (p2_parasitologie) checkSet.add("check_p2_parasitologie");
    if (p2_sangSelles) checkSet.add("check_p2_sangSelles");
    if (p2_diarrhees) checkSet.add("check_p2_diarrhees");
    if (p2_douleursIntestinales) checkSet.add("check_p2_douleursIntestinales");
    if (p2_constipation) checkSet.add("check_p2_constipation");
    if (p2_medecineTravail) checkSet.add("check_p2_medecineTravail");
    if (p2_H1) checkSet.add("check_p2_H1");
    if (p2_H2) checkSet.add("check_p2_H2");
    if (p2_H3) checkSet.add("check_p2_H3");
    if (p2_prelevPeripherique) checkSet.add("check_p2_prelevPeripherique");
    if (p2_prelevCatheter) checkSet.add("check_p2_prelevCatheter");
    if (p2_suspicionEndocardite) checkSet.add("check_p2_suspicionEndocardite");
    if (p2_nc_identPrelevement) checkSet.add("check_p2_nc_identPrelevement");
    if (p2_nc_ordonnance) checkSet.add("check_p2_nc_ordonnance");
    if (p2_nc_tubesTrop) checkSet.add("check_p2_nc_tubesTrop");
    if (p2_nc_tubesManquants) checkSet.add("check_p2_nc_tubesManquants");
    if (p2_nc_caillotHemolyse) checkSet.add("check_p2_nc_caillotHemolyse");
    if (p2_nc_tubesPerimes) checkSet.add("check_p2_nc_tubesPerimes");
    if (p2_nc_identPatient) checkSet.add("check_p2_nc_identPatient");
    if (p2_nc_prelevHeure) checkSet.add("check_p2_nc_prelevHeure");
    if (p2_nc_delai) checkSet.add("check_p2_nc_delai");
    if (p2_nc_delaiDerogation) checkSet.add("check_p2_nc_delaiDerogation");
    if (p2_nc_renseignementsCliniques) checkSet.add("check_p2_nc_renseignementsCliniques");
    setPreviewData({
      ideName: user?.fullName ?? "",
      ideCabinet: user?.cabinetName ?? "",
      nomUsuel: nomUsuel.toUpperCase(),
      prenoms,
      dateNaissance: formattedDN,
      sexe,
      adresse,
      telephone,
      numSecu,
      medecinTraitant,
      prescripteur,
      datePrelevement: formattedDP,
      heurePrelevement,
      grossesse,
      fievre,
      traitements,
      urgent,
      anticoagulant: selectedAnticoagulant,
      posologie,
      inrCible,
      mutuelle,
      finDeDroit: (() => { const fd = finDeDroit; if (fd && fd.includes("-")) { const p = fd.split("-"); if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`; } return fd; })(),
      selectedChecks: checkSet,
      renouvelable,
      dateRenouvelable,
      customFieldValues: {
        ...customFieldValues,
        // Page 1 enrichment text values
        text_nomNaissance: nomNaissanceVal,
        text_lieuNaissance: lieuNaissance,
        text_etablissementSoins: etablissementSoins,
        text_demandeEtiquettes: demandeEtiquettes,
        text_pathologieConnueTexte: pathologieConnueTexte,
        text_cliniqueRhophylacDate: cliniqueRhophylacDate,
        text_cliniqueMedicamentsDateHeure: cliniqueMedicamentsDateHeure,
        text_cliniqueDateDernieresRegles: cliniqueDateDernieresRegles,
        text_cliniqueAutres: cliniqueAutres,
        text_prelevementAutres: prelevementAutres,
        text_nbTubesBleu: nbTubesBleu,
        text_nbTubesJaune: nbTubesJaune,
        text_nbTubesViolet: nbTubesViolet,
        text_nbTubesGris: nbTubesGris,
        text_GPP_heure: gppHeure,
        // Page 2 text values
        text_p2_antibio: p2_antibio,
        text_p2_autreRcUrinaire: p2_autreRcUrinaire,
        text_p2_24h_dateDebut: p2_24h_dateDebut,
        text_p2_24h_dateFin: p2_24h_dateFin,
        text_p2_diurese: p2_diurese,
        text_p2_biochimieAutreTexte: p2_biochimieAutreTexte,
        text_p2_ecbu_date: p2_ecbu_date,
        text_p2_ecbu_heure: p2_ecbu_heure,
        text_p2_surSondeType: p2_surSondeType,
        text_p2_ecbuAutre: p2_ecbuAutre,
        text_p2_autreMotifEcbu: p2_autreMotifEcbu,
        text_p2_antibioLequel: p2_antibioLequel,
        text_p2_plaie_date: p2_plaie_date,
        text_p2_plaie_heure: p2_plaie_heure,
        text_p2_plaie_aspect: p2_plaie_aspect,
        text_p2_plaie_localisation: p2_plaie_localisation,
        text_p2_plaie_contexte: p2_plaie_contexte,
        text_p2_selles_date: p2_selles_date,
        text_p2_selles_heure: p2_selles_heure,
        text_p2_sellesAutre: p2_sellesAutre,
        text_p2_voyageZone: p2_voyageZone,
        text_p2_hemo_date: p2_hemo_date,
        text_p2_hemo_heure: p2_hemo_heure,
        text_p2_fievreTemp: p2_fievreTemp,
        text_p2_autres_date: p2_autres_date,
        text_p2_autres_heure: p2_autres_heure,
        text_p2_autres_nature: p2_autres_nature,
        text_p2_autres_localisation: p2_autres_localisation,
        text_p2_autres_contexte: p2_autres_contexte,
        text_p2_secretaire: p2_secretaire,
        text_p2_technicien: p2_technicien,
        text_p2_reception_date: p2_reception_date,
        text_p2_reception_heure: p2_reception_heure,
        text_p2_nc_autre: p2_nc_autre,
      },
    });
  }, [nomUsuel, prenoms, dateNaissance, adresse, sexe, telephone, numSecu,
    medecinTraitant, prescripteur, mutuelle, finDeDroit,
    datePrelevement, heurePrelevement, grossesse, fievre,
    traitements, urgent, renouvelable, dateRenouvelable,
    selectedAnticoagulant, posologie, inrCible,
    resMedFaxer, resMedTelephoner, resMedPoster, resIdeTelephoner, resIdeSms,
    resPatLabo, resPatInternet, resPatSms, resPatOppose, controleDemande,
    pieceCni, piecePasseport, pieceTitre,
    selectedAnalyses, user, customFieldValues,
    // Page 1 enrichments
    nomNaissanceVal, lieuNaissance, etablissementSoins, demandeEtiquettes,
    pathologieConnue, pathologieConnueTexte,
    cliniqueChimiotherapie, cliniqueAntibiotherapie, cliniqueDialyse, cliniqueSuiviHemopathie,
    cliniqueTraitementEPO, cliniqueTransfusion4mois, cliniqueInjectionRhophylac, cliniqueRhophylacDate,
    cliniqueMedicamentsDateHeure, cliniqueDateDernieresRegles, cliniqueAutres,
    sansGarrot, veinesDifficiles, prelevementAutres, nbTubesBleu, nbTubesJaune, nbTubesViolet, nbTubesGris,
    gppHeure, gppApresDejeuner, gppApresPetitDejeuner,
    // Page 2
    p2_antibio, p2_chimiotherapie, p2_fievreUrines, p2_grossesseUrines, p2_autreRcUrinaire,
    p2_24h, p2_24h_dateDebut, p2_24h_dateFin, p2_diurese, p2_echantillon,
    p2_proteinurie, p2_glycosurie, p2_microAlbuminurie, p2_ionoUrinaire,
    p2_ureeUrinaire, p2_acUriqueUrinaire, p2_creatinineUrinaire,
    p2_calciumUrinaire, p2_phosphoreUrinaire, p2_biochimieAutre, p2_biochimieAutreTexte,
    p2_ecbu_date, p2_ecbu_heure, p2_2emeJet, p2_surSonde, p2_surSondeType,
    p2_apresChangementSonde, p2_sondage, p2_collecteurBebe, p2_collecteurPenien, p2_ecbuAutre,
    p2_fievreEcbu, p2_douleursPubiennes, p2_brulure, p2_douleursMictionnelles,
    p2_pollakiurie, p2_ecoulement, p2_douleursLombaires, p2_hematurieMacro,
    p2_autreMotifEcbu, p2_mictionsImperieuses, p2_absenceSignes, p2_dysurie,
    p2_grossesseEtat, p2_bilanPreop, p2_chimiotherapieEtat, p2_greffe,
    p2_dialyse, p2_hospiRecente, p2_antibio7j, p2_antibioLequel,
    p2_plaie_date, p2_plaie_heure, p2_plaie_aspect, p2_plaie_localisation, p2_plaie_contexte,
    p2_coproculture, p2_parasitologie, p2_sangSelles, p2_selles_date, p2_selles_heure,
    p2_diarrhees, p2_douleursIntestinales, p2_constipation, p2_sellesAutre, p2_voyageZone, p2_medecineTravail,
    p2_H1, p2_H2, p2_H3, p2_prelevPeripherique, p2_prelevCatheter,
    p2_hemo_date, p2_hemo_heure, p2_fievreTemp, p2_suspicionEndocardite,
    p2_autres_date, p2_autres_heure, p2_autres_nature, p2_autres_localisation, p2_autres_contexte,
    p2_secretaire, p2_technicien, p2_reception_date, p2_reception_heure,
    p2_nc_identPrelevement, p2_nc_ordonnance, p2_nc_tubesTrop, p2_nc_tubesManquants,
    p2_nc_caillotHemolyse, p2_nc_tubesPerimes, p2_nc_identPatient, p2_nc_prelevHeure,
    p2_nc_delai, p2_nc_delaiDerogation, p2_nc_renseignementsCliniques, p2_nc_autre]);

  // Fetch OrdoFill patients
  const { data: ordofillPatients = [], isLoading: ordofillLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch OrdoCAL patients
  const ordocalUserId = user?.ordocalUserId;
  const { data: ordocalPatients = [], isLoading: ordocalLoading } = useQuery<OrdocalPatient[]>({
    queryKey: ["/api/ordocal/patients", ordocalUserId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!ordocalUserId,
  });

  // Convert to unified shapes
  const unifiedOrdofill: UnifiedPatient[] = ordofillPatients.map((p) => ({
    id: p.id,
    nom: p.lastName,
    prenom: p.firstName,
    telephone: p.phone ?? null,
    date_naissance: p.dateOfBirth ?? null,
    adresse: p.address ?? null,
    ville: p.city ?? null,
    code_postal: p.postalCode ?? null,
    numero_securite_sociale: p.numeroSecuriteSociale ?? null,
    genre: p.gender ?? null,
    medecin_traitant: p.medecinTraitant ?? null,
    notes: p.notes ?? null,
    source: "ordofill" as const,
  }));

  const unifiedOrdocal: UnifiedPatient[] = ordocalPatients.map((p) => ({
    ...p,
    source: "ordocal" as const,
  }));

  // Deduplicate: remove OrdoFill patients that already exist in OrdoCal (matched by name)
  const ordocalNameSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of ordocalPatients) {
      s.add(`${(p.nom ?? "").toLowerCase()}|${(p.prenom ?? "").toLowerCase()}`);
    }
    return s;
  }, [ordocalPatients]);

  const filteredOrdofill = unifiedOrdofill.filter(
    (p) => !ordocalNameSet.has(`${(p.nom ?? "").toLowerCase()}|${(p.prenom ?? "").toLowerCase()}`)
  );

  const currentPatients = patientSource === "ordofill" ? filteredOrdofill : unifiedOrdocal;
  const patientsLoading = patientSource === "ordofill" ? ordofillLoading : ordocalLoading;

  // Sort and filter patients
  const sortedCurrentPatients = [...currentPatients].sort((a, b) => {
    const cmp = (a.nom ?? "").localeCompare(b.nom ?? "", "fr", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.prenom ?? "").localeCompare(b.prenom ?? "", "fr", { sensitivity: "base" });
  });

  const filteredPatients = sortedCurrentPatients.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nom?.toLowerCase().includes(term) ||
      p.prenom?.toLowerCase().includes(term) ||
      p.telephone?.includes(term) ||
      p.numero_securite_sociale?.includes(term)
    );
  });

  // Auto-fill when patient selected
  useEffect(() => {
    if (selectedPatient) {
      setNomUsuel(selectedPatient.nom ?? "");
      setPrenoms(selectedPatient.prenom ?? "");
      setDateNaissance(selectedPatient.date_naissance ?? "");
      const fullAddress = [
        selectedPatient.adresse,
        selectedPatient.ville,
        selectedPatient.code_postal,
      ].filter(Boolean).join(", ");
      setAdresse(fullAddress);
      setSexe(selectedPatient.genre ?? "");
      setTelephone(selectedPatient.telephone ?? "");
      setNumSecu(selectedPatient.numero_securite_sociale ?? "");
      setMedecinTraitant(selectedPatient.medecin_traitant ?? "");
      setPrescripteur(selectedPatient.medecin_traitant ?? "");

      toast({
        title: "Patient sélectionné",
        description: `${formatName(selectedPatient.nom ?? "", selectedPatient.prenom ?? "")} — Données pré-remplies`,
      });
    }
  }, [selectedPatient]);

  // Auto-save draft every 10 seconds
  const getCurrentDraftData = useCallback((): FicheDraftData => ({
    nomUsuel,
    prenoms,
    dateNaissance,
    adresse,
    sexe,
    telephone,
    numSecu,
    medecinTraitant,
    prescripteur,
    mutuelle,
    finDeDroit,
    resMedFaxer, resMedTelephoner, resMedPoster,
    resIdeTelephoner, resIdeSms,
    resPatLabo, resPatInternet, resPatSms, resPatOppose,
    controleDemande,
    pieceCni, piecePasseport, pieceTitre,
    datePrelevement,
    heurePrelevement,
    grossesse,
    fievre,
    traitements,
    urgent,
    renouvelable,
    dateRenouvelable,
    selectedAnticoagulant,
    posologie,
    inrCible,
    selectedAnalyses: Array.from(selectedAnalyses),
    patientSource,
    patientId: selectedPatient?.id ?? null,
    customFieldValues,
    // Page 1 enrichments
    nomNaissanceVal, lieuNaissance, etablissementSoins, demandeEtiquettes,
    pathologieConnue, pathologieConnueTexte,
    cliniqueChimiotherapie, cliniqueAntibiotherapie, cliniqueDialyse, cliniqueSuiviHemopathie,
    cliniqueTraitementEPO, cliniqueTransfusion4mois, cliniqueInjectionRhophylac, cliniqueRhophylacDate,
    cliniqueMedicamentsDateHeure, cliniqueDateDernieresRegles, cliniqueAutres,
    sansGarrot, veinesDifficiles, prelevementAutres, nbTubesBleu, nbTubesJaune, nbTubesViolet, nbTubesGris,
    gppHeure, gppApresDejeuner, gppApresPetitDejeuner,
    // Page 2
    p2_antibio, p2_chimiotherapie, p2_fievreUrines, p2_grossesseUrines, p2_autreRcUrinaire,
    p2_24h, p2_24h_dateDebut, p2_24h_dateFin, p2_diurese, p2_echantillon,
    p2_proteinurie, p2_glycosurie, p2_microAlbuminurie, p2_ionoUrinaire,
    p2_ureeUrinaire, p2_acUriqueUrinaire, p2_creatinineUrinaire,
    p2_calciumUrinaire, p2_phosphoreUrinaire, p2_biochimieAutre, p2_biochimieAutreTexte,
    p2_ecbu_date, p2_ecbu_heure, p2_2emeJet, p2_surSonde, p2_surSondeType,
    p2_apresChangementSonde, p2_sondage, p2_collecteurBebe, p2_collecteurPenien, p2_ecbuAutre,
    p2_fievreEcbu, p2_douleursPubiennes, p2_brulure, p2_douleursMictionnelles,
    p2_pollakiurie, p2_ecoulement, p2_douleursLombaires, p2_hematurieMacro,
    p2_autreMotifEcbu, p2_mictionsImperieuses, p2_absenceSignes, p2_dysurie,
    p2_grossesseEtat, p2_bilanPreop, p2_chimiotherapieEtat, p2_greffe,
    p2_dialyse, p2_hospiRecente, p2_antibio7j, p2_antibioLequel,
    p2_plaie_date, p2_plaie_heure, p2_plaie_aspect, p2_plaie_localisation, p2_plaie_contexte,
    p2_coproculture, p2_parasitologie, p2_sangSelles, p2_selles_date, p2_selles_heure,
    p2_diarrhees, p2_douleursIntestinales, p2_constipation, p2_sellesAutre, p2_voyageZone, p2_medecineTravail,
    p2_H1, p2_H2, p2_H3, p2_prelevPeripherique, p2_prelevCatheter,
    p2_hemo_date, p2_hemo_heure, p2_fievreTemp, p2_suspicionEndocardite,
    p2_autres_date, p2_autres_heure, p2_autres_nature, p2_autres_localisation, p2_autres_contexte,
    p2_secretaire, p2_technicien, p2_reception_date, p2_reception_heure,
    p2_nc_identPrelevement, p2_nc_ordonnance, p2_nc_tubesTrop, p2_nc_tubesManquants,
    p2_nc_caillotHemolyse, p2_nc_tubesPerimes, p2_nc_identPatient, p2_nc_prelevHeure,
    p2_nc_delai, p2_nc_delaiDerogation, p2_nc_renseignementsCliniques, p2_nc_autre,
  }), [nomUsuel, prenoms, dateNaissance, adresse, sexe, telephone, numSecu, medecinTraitant, prescripteur, mutuelle, finDeDroit, resMedFaxer, resMedTelephoner, resMedPoster, resIdeTelephoner, resIdeSms, resPatLabo, resPatInternet, resPatSms, resPatOppose, controleDemande, pieceCni, piecePasseport, pieceTitre, datePrelevement, heurePrelevement, grossesse, fievre, traitements, urgent, renouvelable, dateRenouvelable, selectedAnticoagulant, posologie, inrCible, selectedAnalyses, patientSource, selectedPatient, customFieldValues, nomNaissanceVal, lieuNaissance, etablissementSoins, demandeEtiquettes, pathologieConnue, pathologieConnueTexte, cliniqueChimiotherapie, cliniqueAntibiotherapie, cliniqueDialyse, cliniqueSuiviHemopathie, cliniqueTraitementEPO, cliniqueTransfusion4mois, cliniqueInjectionRhophylac, cliniqueRhophylacDate, cliniqueMedicamentsDateHeure, cliniqueDateDernieresRegles, cliniqueAutres, sansGarrot, veinesDifficiles, prelevementAutres, nbTubesBleu, nbTubesJaune, nbTubesViolet, nbTubesGris, gppHeure, gppApresDejeuner, gppApresPetitDejeuner, p2_antibio, p2_chimiotherapie, p2_fievreUrines, p2_grossesseUrines, p2_autreRcUrinaire, p2_24h, p2_24h_dateDebut, p2_24h_dateFin, p2_diurese, p2_echantillon, p2_proteinurie, p2_glycosurie, p2_microAlbuminurie, p2_ionoUrinaire, p2_ureeUrinaire, p2_acUriqueUrinaire, p2_creatinineUrinaire, p2_calciumUrinaire, p2_phosphoreUrinaire, p2_biochimieAutre, p2_biochimieAutreTexte, p2_ecbu_date, p2_ecbu_heure, p2_2emeJet, p2_surSonde, p2_surSondeType, p2_apresChangementSonde, p2_sondage, p2_collecteurBebe, p2_collecteurPenien, p2_ecbuAutre, p2_fievreEcbu, p2_douleursPubiennes, p2_brulure, p2_douleursMictionnelles, p2_pollakiurie, p2_ecoulement, p2_douleursLombaires, p2_hematurieMacro, p2_autreMotifEcbu, p2_mictionsImperieuses, p2_absenceSignes, p2_dysurie, p2_grossesseEtat, p2_bilanPreop, p2_chimiotherapieEtat, p2_greffe, p2_dialyse, p2_hospiRecente, p2_antibio7j, p2_antibioLequel, p2_plaie_date, p2_plaie_heure, p2_plaie_aspect, p2_plaie_localisation, p2_plaie_contexte, p2_coproculture, p2_parasitologie, p2_sangSelles, p2_selles_date, p2_selles_heure, p2_diarrhees, p2_douleursIntestinales, p2_constipation, p2_sellesAutre, p2_voyageZone, p2_medecineTravail, p2_H1, p2_H2, p2_H3, p2_prelevPeripherique, p2_prelevCatheter, p2_hemo_date, p2_hemo_heure, p2_fievreTemp, p2_suspicionEndocardite, p2_autres_date, p2_autres_heure, p2_autres_nature, p2_autres_localisation, p2_autres_contexte, p2_secretaire, p2_technicien, p2_reception_date, p2_reception_heure, p2_nc_identPrelevement, p2_nc_ordonnance, p2_nc_tubesTrop, p2_nc_tubesManquants, p2_nc_caillotHemolyse, p2_nc_tubesPerimes, p2_nc_identPatient, p2_nc_prelevHeure, p2_nc_delai, p2_nc_delaiDerogation, p2_nc_renseignementsCliniques, p2_nc_autre]);

  useEffect(() => {
    // Only auto-save if there's meaningful data
    if (!nomUsuel && !prenoms && selectedAnalyses.size === 0) return;

    const timer = setInterval(() => {
      const draft: FicheDraft = {
        id: currentDraftId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        patientName: nomUsuel ? formatName(nomUsuel, prenoms) : "Brouillon sans nom",
        data: getCurrentDraftData(),
      };
      saveDraft(draft);
      setDrafts(getDrafts());
    }, 10000);

    return () => clearInterval(timer);
  }, [currentDraftId, getCurrentDraftData, nomUsuel, prenoms, selectedAnalyses.size]);

  const handleSaveDraft = () => {
    const draft: FicheDraft = {
      id: currentDraftId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      patientName: nomUsuel ? formatName(nomUsuel, prenoms) : "Brouillon sans nom",
      data: getCurrentDraftData(),
    };
    saveDraft(draft);
    setDrafts(getDrafts());
    toast({ title: "Brouillon sauvegarde" });
  };

  const handleLoadDraft = (draft: FicheDraft) => {
    setCurrentDraftId(draft.id);
    const d = draft.data;
    setNomUsuel(d.nomUsuel);
    setPrenoms(d.prenoms);
    setDateNaissance(d.dateNaissance);
    setAdresse(d.adresse);
    setSexe(d.sexe);
    setTelephone(d.telephone);
    setNumSecu(d.numSecu);
    setMedecinTraitant(d.medecinTraitant);
    setPrescripteur(d.prescripteur ?? d.medecinTraitant);
    setMutuelle(d.mutuelle ?? "");
    setFinDeDroit(d.finDeDroit ?? "");
    setResMedFaxer(d.resMedFaxer ?? false);
    setResMedTelephoner(d.resMedTelephoner ?? false);
    setResMedPoster(d.resMedPoster ?? false);
    setResIdeTelephoner(d.resIdeTelephoner ?? false);
    setResIdeSms(d.resIdeSms ?? false);
    setResPatLabo(d.resPatLabo ?? false);
    setResPatInternet(d.resPatInternet ?? false);
    setResPatSms(d.resPatSms ?? false);
    setResPatOppose(d.resPatOppose ?? false);
    setControleDemande(d.controleDemande ?? false);
    setPieceCni(d.pieceCni ?? false);
    setPiecePasseport(d.piecePasseport ?? false);
    setPieceTitre(d.pieceTitre ?? false);
    setDatePrelevement(d.datePrelevement);
    setHeurePrelevement(d.heurePrelevement);
    setGrossesse(d.grossesse);
    setFievre(d.fievre);
    setTraitements(d.traitements);
    setUrgent(d.urgent);
    setRenouvelable(d.renouvelable ?? false);
    setDateRenouvelable(d.dateRenouvelable ?? "");
    setSelectedAnticoagulant(d.selectedAnticoagulant);
    setPosologie(d.posologie);
    setInrCible(d.inrCible);
    setSelectedAnalyses(new Set(d.selectedAnalyses));
    setCustomFieldValues(d.customFieldValues ?? {});
    setPatientSource(d.patientSource);
    // Page 1 enrichments
    setNomNaissanceVal(d.nomNaissanceVal ?? "");
    setLieuNaissance(d.lieuNaissance ?? "");
    setEtablissementSoins(d.etablissementSoins ?? "");
    setDemandeEtiquettes(d.demandeEtiquettes ?? "");
    setPathologieConnue(d.pathologieConnue ?? false);
    setPathologieConnueTexte(d.pathologieConnueTexte ?? "");
    setCliniqueChimiotherapie(d.cliniqueChimiotherapie ?? false);
    setCliniqueAntibiotherapie(d.cliniqueAntibiotherapie ?? false);
    setCliniqueDialyse(d.cliniqueDialyse ?? false);
    setCliniqueSuiviHemopathie(d.cliniqueSuiviHemopathie ?? false);
    setCliniqueTraitementEPO(d.cliniqueTraitementEPO ?? false);
    setCliniqueTransfusion4mois(d.cliniqueTransfusion4mois ?? false);
    setCliniqueInjectionRhophylac(d.cliniqueInjectionRhophylac ?? false);
    setCliniqueRhophylacDate(d.cliniqueRhophylacDate ?? "");
    setCliniqueMedicamentsDateHeure(d.cliniqueMedicamentsDateHeure ?? "");
    setCliniqueDateDernieresRegles(d.cliniqueDateDernieresRegles ?? "");
    setCliniqueAutres(d.cliniqueAutres ?? "");
    setSansGarrot(d.sansGarrot ?? false);
    setVeinesDifficiles(d.veinesDifficiles ?? false);
    setPrelevementAutres(d.prelevementAutres ?? "");
    setNbTubesBleu(d.nbTubesBleu ?? d.nbTubes ?? "");
    setNbTubesJaune(d.nbTubesJaune ?? "");
    setNbTubesViolet(d.nbTubesViolet ?? "");
    setNbTubesGris(d.nbTubesGris ?? "");
    setGppHeure(d.gppHeure ?? "");
    setGppApresDejeuner(d.gppApresDejeuner ?? false);
    setGppApresPetitDejeuner(d.gppApresPetitDejeuner ?? false);
    // Page 2
    setP2Antibio(d.p2_antibio ?? "");
    setP2Chimiotherapie(d.p2_chimiotherapie ?? false);
    setP2FievreUrines(d.p2_fievreUrines ?? false);
    setP2GrossesseUrines(d.p2_grossesseUrines ?? false);
    setP2AutreRcUrinaire(d.p2_autreRcUrinaire ?? "");
    setP2_24h(d.p2_24h ?? false);
    setP2_24hDateDebut(d.p2_24h_dateDebut ?? "");
    setP2_24hDateFin(d.p2_24h_dateFin ?? "");
    setP2Diurese(d.p2_diurese ?? "");
    setP2Echantillon(d.p2_echantillon ?? false);
    setP2Proteinurie(d.p2_proteinurie ?? false);
    setP2Glycosurie(d.p2_glycosurie ?? false);
    setP2MicroAlbuminurie(d.p2_microAlbuminurie ?? false);
    setP2IonoUrinaire(d.p2_ionoUrinaire ?? false);
    setP2UreeUrinaire(d.p2_ureeUrinaire ?? false);
    setP2AcUriqueUrinaire(d.p2_acUriqueUrinaire ?? false);
    setP2CreatinineUrinaire(d.p2_creatinineUrinaire ?? false);
    setP2CalciumUrinaire(d.p2_calciumUrinaire ?? false);
    setP2PhosphoreUrinaire(d.p2_phosphoreUrinaire ?? false);
    setP2BiochimieAutre(d.p2_biochimieAutre ?? false);
    setP2BiochimieAutreTexte(d.p2_biochimieAutreTexte ?? "");
    setP2EcbuDate(d.p2_ecbu_date ?? "");
    setP2EcbuHeure(d.p2_ecbu_heure ?? "");
    setP2_2emeJet(d.p2_2emeJet ?? false);
    setP2SurSonde(d.p2_surSonde ?? false);
    setP2SurSondeType(d.p2_surSondeType ?? "");
    setP2ApresChangementSonde(d.p2_apresChangementSonde ?? false);
    setP2Sondage(d.p2_sondage ?? false);
    setP2CollecteurBebe(d.p2_collecteurBebe ?? false);
    setP2CollecteurPenien(d.p2_collecteurPenien ?? false);
    setP2EcbuAutre(d.p2_ecbuAutre ?? "");
    setP2FievreEcbu(d.p2_fievreEcbu ?? false);
    setP2DouleursPubiennes(d.p2_douleursPubiennes ?? false);
    setP2Brulure(d.p2_brulure ?? false);
    setP2DouleursMictionnelles(d.p2_douleursMictionnelles ?? false);
    setP2Pollakiurie(d.p2_pollakiurie ?? false);
    setP2Ecoulement(d.p2_ecoulement ?? false);
    setP2DouleursLombaires(d.p2_douleursLombaires ?? false);
    setP2HematurieMacro(d.p2_hematurieMacro ?? false);
    setP2AutreMotifEcbu(d.p2_autreMotifEcbu ?? "");
    setP2MictionsImperieuses(d.p2_mictionsImperieuses ?? false);
    setP2AbsenceSignes(d.p2_absenceSignes ?? false);
    setP2Dysurie(d.p2_dysurie ?? false);
    setP2GrossesseEtat(d.p2_grossesseEtat ?? false);
    setP2BilanPreop(d.p2_bilanPreop ?? false);
    setP2ChimiotherapieEtat(d.p2_chimiotherapieEtat ?? false);
    setP2Greffe(d.p2_greffe ?? false);
    setP2Dialyse(d.p2_dialyse ?? false);
    setP2HospiRecente(d.p2_hospiRecente ?? false);
    setP2Antibio7j(d.p2_antibio7j ?? false);
    setP2AntibioLequel(d.p2_antibioLequel ?? "");
    setP2PlaieDate(d.p2_plaie_date ?? "");
    setP2PlaieHeure(d.p2_plaie_heure ?? "");
    setP2PlaieAspect(d.p2_plaie_aspect ?? "");
    setP2PlaieLocalisation(d.p2_plaie_localisation ?? "");
    setP2PlaieContexte(d.p2_plaie_contexte ?? "");
    setP2Coproculture(d.p2_coproculture ?? false);
    setP2Parasitologie(d.p2_parasitologie ?? false);
    setP2SangSelles(d.p2_sangSelles ?? false);
    setP2SellesDate(d.p2_selles_date ?? "");
    setP2SellesHeure(d.p2_selles_heure ?? "");
    setP2Diarrhees(d.p2_diarrhees ?? false);
    setP2DouleursIntestinales(d.p2_douleursIntestinales ?? false);
    setP2Constipation(d.p2_constipation ?? false);
    setP2SellesAutre(d.p2_sellesAutre ?? "");
    setP2VoyageZone(d.p2_voyageZone ?? "");
    setP2MedecineTravail(d.p2_medecineTravail ?? false);
    setP2H1(d.p2_H1 ?? false);
    setP2H2(d.p2_H2 ?? false);
    setP2H3(d.p2_H3 ?? false);
    setP2PrelevPeripherique(d.p2_prelevPeripherique ?? false);
    setP2PrelevCatheter(d.p2_prelevCatheter ?? false);
    setP2HemoDate(d.p2_hemo_date ?? "");
    setP2HemoHeure(d.p2_hemo_heure ?? "");
    setP2FievreTemp(d.p2_fievreTemp ?? "");
    setP2SuspicionEndocardite(d.p2_suspicionEndocardite ?? false);
    setP2AutresDate(d.p2_autres_date ?? "");
    setP2AutresHeure(d.p2_autres_heure ?? "");
    setP2AutresNature(d.p2_autres_nature ?? "");
    setP2AutresLocalisation(d.p2_autres_localisation ?? "");
    setP2AutresContexte(d.p2_autres_contexte ?? "");
    setP2Secretaire(d.p2_secretaire ?? "");
    setP2Technicien(d.p2_technicien ?? "");
    setP2ReceptionDate(d.p2_reception_date ?? "");
    setP2ReceptionHeure(d.p2_reception_heure ?? "");
    setP2NcIdentPrelevement(d.p2_nc_identPrelevement ?? false);
    setP2NcOrdonnance(d.p2_nc_ordonnance ?? false);
    setP2NcTubesTrop(d.p2_nc_tubesTrop ?? false);
    setP2NcTubesManquants(d.p2_nc_tubesManquants ?? false);
    setP2NcCaillotHemolyse(d.p2_nc_caillotHemolyse ?? false);
    setP2NcTubesPerimes(d.p2_nc_tubesPerimes ?? false);
    setP2NcIdentPatient(d.p2_nc_identPatient ?? false);
    setP2NcPrelevHeure(d.p2_nc_prelevHeure ?? false);
    setP2NcDelai(d.p2_nc_delai ?? false);
    setP2NcDelaiDerogation(d.p2_nc_delaiDerogation ?? false);
    setP2NcRenseignementsCliniques(d.p2_nc_renseignementsCliniques ?? false);
    setP2NcAutre(d.p2_nc_autre ?? "");
    setSelectedPatient(null);
    setDraftsOpen(false);
    toast({ title: "Brouillon charge", description: draft.patientName });
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    setDrafts(getDrafts());
    if (id === currentDraftId) {
      handleNewForm();
    }
    toast({ title: "Brouillon supprime" });
  };

  const handleNewForm = () => {
    setCurrentDraftId(createNewDraftId());
    setNomUsuel("");
    setPrenoms("");
    setDateNaissance("");
    setAdresse("");
    setSexe("");
    setTelephone("");
    setNumSecu("");
    setMedecinTraitant("");
    setPrescripteur("");
    setMutuelle("");
    setFinDeDroit("");
    setResMedFaxer(false);
    setResMedTelephoner(false);
    setResMedPoster(false);
    setResIdeTelephoner(false);
    setResIdeSms(false);
    setResPatLabo(false);
    setResPatInternet(false);
    setResPatSms(false);
    setResPatOppose(false);
    setControleDemande(false);
    setPieceCni(false);
    setPiecePasseport(false);
    setPieceTitre(false);
    setDatePrelevement(new Date().toISOString().slice(0, 10));
    setHeurePrelevement(new Date().toTimeString().slice(0, 5));
    setGrossesse(false);
    setFievre(false);
    setTraitements("");
    setUrgent(false);
    setRenouvelable(false);
    setDateRenouvelable("");
    setSelectedAnticoagulant("");
    setPosologie("");
    setInrCible("");
    setSelectedAnalyses(new Set());
    setCustomFieldValues({});
    // Page 1 enrichments
    setNomNaissanceVal("");
    setLieuNaissance("");
    setEtablissementSoins("");
    setDemandeEtiquettes("");
    setPathologieConnue(false);
    setPathologieConnueTexte("");
    setCliniqueChimiotherapie(false);
    setCliniqueAntibiotherapie(false);
    setCliniqueDialyse(false);
    setCliniqueSuiviHemopathie(false);
    setCliniqueTraitementEPO(false);
    setCliniqueTransfusion4mois(false);
    setCliniqueInjectionRhophylac(false);
    setCliniqueRhophylacDate("");
    setCliniqueMedicamentsDateHeure("");
    setCliniqueDateDernieresRegles("");
    setCliniqueAutres("");
    setSansGarrot(false);
    setVeinesDifficiles(false);
    setPrelevementAutres("");
    setNbTubesBleu("");
    setNbTubesJaune("");
    setNbTubesViolet("");
    setNbTubesGris("");
    setGppHeure("");
    setGppApresDejeuner(false);
    setGppApresPetitDejeuner(false);
    // Page 2
    setP2Antibio("");
    setP2Chimiotherapie(false);
    setP2FievreUrines(false);
    setP2GrossesseUrines(false);
    setP2AutreRcUrinaire("");
    setP2_24h(false);
    setP2_24hDateDebut("");
    setP2_24hDateFin("");
    setP2Diurese("");
    setP2Echantillon(false);
    setP2Proteinurie(false);
    setP2Glycosurie(false);
    setP2MicroAlbuminurie(false);
    setP2IonoUrinaire(false);
    setP2UreeUrinaire(false);
    setP2AcUriqueUrinaire(false);
    setP2CreatinineUrinaire(false);
    setP2CalciumUrinaire(false);
    setP2PhosphoreUrinaire(false);
    setP2BiochimieAutre(false);
    setP2BiochimieAutreTexte("");
    setP2EcbuDate("");
    setP2EcbuHeure("");
    setP2_2emeJet(false);
    setP2SurSonde(false);
    setP2SurSondeType("");
    setP2ApresChangementSonde(false);
    setP2Sondage(false);
    setP2CollecteurBebe(false);
    setP2CollecteurPenien(false);
    setP2EcbuAutre("");
    setP2FievreEcbu(false);
    setP2DouleursPubiennes(false);
    setP2Brulure(false);
    setP2DouleursMictionnelles(false);
    setP2Pollakiurie(false);
    setP2Ecoulement(false);
    setP2DouleursLombaires(false);
    setP2HematurieMacro(false);
    setP2AutreMotifEcbu("");
    setP2MictionsImperieuses(false);
    setP2AbsenceSignes(false);
    setP2Dysurie(false);
    setP2GrossesseEtat(false);
    setP2BilanPreop(false);
    setP2ChimiotherapieEtat(false);
    setP2Greffe(false);
    setP2Dialyse(false);
    setP2HospiRecente(false);
    setP2Antibio7j(false);
    setP2AntibioLequel("");
    setP2PlaieDate("");
    setP2PlaieHeure("");
    setP2PlaieAspect("");
    setP2PlaieLocalisation("");
    setP2PlaieContexte("");
    setP2Coproculture(false);
    setP2Parasitologie(false);
    setP2SangSelles(false);
    setP2SellesDate("");
    setP2SellesHeure("");
    setP2Diarrhees(false);
    setP2DouleursIntestinales(false);
    setP2Constipation(false);
    setP2SellesAutre("");
    setP2VoyageZone("");
    setP2MedecineTravail(false);
    setP2H1(false);
    setP2H2(false);
    setP2H3(false);
    setP2PrelevPeripherique(false);
    setP2PrelevCatheter(false);
    setP2HemoDate("");
    setP2HemoHeure("");
    setP2FievreTemp("");
    setP2SuspicionEndocardite(false);
    setP2AutresDate("");
    setP2AutresHeure("");
    setP2AutresNature("");
    setP2AutresLocalisation("");
    setP2AutresContexte("");
    setP2Secretaire("");
    setP2Technicien("");
    setP2ReceptionDate("");
    setP2ReceptionHeure("");
    setP2NcIdentPrelevement(false);
    setP2NcOrdonnance(false);
    setP2NcTubesTrop(false);
    setP2NcTubesManquants(false);
    setP2NcCaillotHemolyse(false);
    setP2NcTubesPerimes(false);
    setP2NcIdentPatient(false);
    setP2NcPrelevHeure(false);
    setP2NcDelai(false);
    setP2NcDelaiDerogation(false);
    setP2NcRenseignementsCliniques(false);
    setP2NcAutre("");
    setP2CollapsedSections(new Set(["p2_rc_urinaires", "p2_biochimie_urinaire", "p2_ecbu", "p2_rc_ecbu", "p2_etat_physio", "p2_plaie_pus", "p2_selles", "p2_hemocultures", "p2_autres", "p2_reception", "p2_non_conformite"]));
    setSelectedPatient(null);
    setDraftsOpen(false);
  };

  const toggleAnalysis = (name: string) => {
    setSelectedAnalyses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSection = (index: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const totalAnalyses = selectedAnalyses.size;

  const handleGeneratePDF = async () => {
    // Build analyses by section
    const analysesBySection = TUBE_SECTIONS
      .map((s) => ({
        label: s.label,
        color: s.color,
        analyses: s.analyses.filter((a) => selectedAnalyses.has(a.id)).map((a) => a.id),
      }))
      .filter((s) => s.analyses.length > 0);

    try {
      await generateCerballiancePDF({
        ideName: user?.fullName ?? "",
        idePhone: user?.phone ?? "",
        ideCabinet: user?.cabinetName ?? "",
        ideRpps: user?.numeroRpps ?? "",
        ideAdeli: user?.numeroAdeli ?? "",
        nomUsuel,
        prenoms,
        dateNaissance,
        sexe,
        adresse,
        telephone,
        numSecu,
        medecinTraitant,
        prescripteur,
        mutuelle,
        finDeDroit,
        datePrelevement,
        heurePrelevement,
        grossesse,
        fievre,
        traitements,
        urgent,
        anticoagulant: selectedAnticoagulant,
        posologie,
        inrCible,
        analysesBySection,
        customFields: {
          ...customFieldValues,
          // Native résultats checks
          resultats_medFaxer: resMedFaxer ? "true" : "",
          resultats_medTelephoner: resMedTelephoner ? "true" : "",
          resultats_medPoster: resMedPoster ? "true" : "",
          resultats_ideTelephoner: resIdeTelephoner ? "true" : "",
          resultats_ideSms: resIdeSms ? "true" : "",
          resultats_patLabo: resPatLabo ? "true" : "",
          resultats_patInternet: resPatInternet ? "true" : "",
          resultats_patSms: resPatSms ? "true" : "",
          resultats_patOppose: resPatOppose ? "true" : "",
          resultats_controle: controleDemande ? "true" : "",
          // Prescription
          prescription_renouvelable: renouvelable ? "true" : "",
          prescription_dateRenouvelable: dateRenouvelable,
          // Pièce justificative
          piece_cni: pieceCni ? "true" : "",
          piece_passeport: piecePasseport ? "true" : "",
          piece_titre: pieceTitre ? "true" : "",
          // Page 1 enrichments — Patient
          text_nomNaissance: nomNaissanceVal,
          text_lieuNaissance: lieuNaissance,
          text_etablissementSoins: etablissementSoins,
          text_demandeEtiquettes: demandeEtiquettes,
          // Page 1 enrichments — Clinique
          check_pathologieConnue: pathologieConnue ? "true" : "",
          text_pathologieConnueTexte: pathologieConnueTexte,
          check_chimiotherapie: cliniqueChimiotherapie ? "true" : "",
          check_antibiotherapie: cliniqueAntibiotherapie ? "true" : "",
          check_dialyse: cliniqueDialyse ? "true" : "",
          check_suiviHemopathie: cliniqueSuiviHemopathie ? "true" : "",
          check_traitementEPO: cliniqueTraitementEPO ? "true" : "",
          check_transfusion4mois: cliniqueTransfusion4mois ? "true" : "",
          check_injectionRhophylac: cliniqueInjectionRhophylac ? "true" : "",
          text_cliniqueRhophylacDate: cliniqueRhophylacDate,
          text_cliniqueMedicamentsDateHeure: cliniqueMedicamentsDateHeure,
          text_cliniqueDateDernieresRegles: cliniqueDateDernieresRegles,
          text_cliniqueAutres: cliniqueAutres,
          // Page 1 enrichments — Prélèvement
          check_sansGarrot: sansGarrot ? "true" : "",
          check_veinesDifficiles: veinesDifficiles ? "true" : "",
          text_prelevementAutres: prelevementAutres,
          text_nbTubesBleu: nbTubesBleu,
          text_nbTubesJaune: nbTubesJaune,
          text_nbTubesViolet: nbTubesViolet,
          text_nbTubesGris: nbTubesGris,
          // GPP
          text_gppHeure: gppHeure,
          check_gppApresDejeuner: gppApresDejeuner ? "true" : "",
          check_gppApresPetitDejeuner: gppApresPetitDejeuner ? "true" : "",
          // Page 2 — RC urinaires
          text_p2_antibio: p2_antibio,
          check_p2_chimiotherapie: p2_chimiotherapie ? "true" : "",
          check_p2_fievreUrines: p2_fievreUrines ? "true" : "",
          check_p2_grossesseUrines: p2_grossesseUrines ? "true" : "",
          text_p2_autreRcUrinaire: p2_autreRcUrinaire,
          // Page 2 — Biochimie urinaire
          check_p2_24h: p2_24h ? "true" : "",
          text_p2_24h_dateDebut: p2_24h_dateDebut,
          text_p2_24h_dateFin: p2_24h_dateFin,
          text_p2_diurese: p2_diurese,
          check_p2_echantillon: p2_echantillon ? "true" : "",
          check_p2_proteinurie: p2_proteinurie ? "true" : "",
          check_p2_glycosurie: p2_glycosurie ? "true" : "",
          check_p2_microAlbuminurie: p2_microAlbuminurie ? "true" : "",
          check_p2_ionoUrinaire: p2_ionoUrinaire ? "true" : "",
          check_p2_ureeUrinaire: p2_ureeUrinaire ? "true" : "",
          check_p2_acUriqueUrinaire: p2_acUriqueUrinaire ? "true" : "",
          check_p2_creatinineUrinaire: p2_creatinineUrinaire ? "true" : "",
          check_p2_calciumUrinaire: p2_calciumUrinaire ? "true" : "",
          check_p2_phosphoreUrinaire: p2_phosphoreUrinaire ? "true" : "",
          check_p2_biochimieAutre: p2_biochimieAutre ? "true" : "",
          text_p2_biochimieAutreTexte: p2_biochimieAutreTexte,
          // Page 2 — ECBU
          text_p2_ecbu_date: p2_ecbu_date,
          text_p2_ecbu_heure: p2_ecbu_heure,
          check_p2_2emeJet: p2_2emeJet ? "true" : "",
          check_p2_surSonde: p2_surSonde ? "true" : "",
          text_p2_surSondeType: p2_surSondeType,
          check_p2_apresChangementSonde: p2_apresChangementSonde ? "true" : "",
          check_p2_sondage: p2_sondage ? "true" : "",
          check_p2_collecteurBebe: p2_collecteurBebe ? "true" : "",
          check_p2_collecteurPenien: p2_collecteurPenien ? "true" : "",
          text_p2_ecbuAutre: p2_ecbuAutre,
          // Page 2 — RC ECBU
          check_p2_fievreEcbu: p2_fievreEcbu ? "true" : "",
          check_p2_douleursPubiennes: p2_douleursPubiennes ? "true" : "",
          check_p2_brulure: p2_brulure ? "true" : "",
          check_p2_douleursMictionnelles: p2_douleursMictionnelles ? "true" : "",
          check_p2_pollakiurie: p2_pollakiurie ? "true" : "",
          check_p2_ecoulement: p2_ecoulement ? "true" : "",
          check_p2_douleursLombaires: p2_douleursLombaires ? "true" : "",
          check_p2_hematurieMacro: p2_hematurieMacro ? "true" : "",
          text_p2_autreMotifEcbu: p2_autreMotifEcbu,
          check_p2_mictionsImperieuses: p2_mictionsImperieuses ? "true" : "",
          check_p2_absenceSignes: p2_absenceSignes ? "true" : "",
          check_p2_dysurie: p2_dysurie ? "true" : "",
          // Page 2 — État physiologique
          check_p2_grossesseEtat: p2_grossesseEtat ? "true" : "",
          check_p2_bilanPreop: p2_bilanPreop ? "true" : "",
          check_p2_chimiotherapieEtat: p2_chimiotherapieEtat ? "true" : "",
          check_p2_greffe: p2_greffe ? "true" : "",
          check_p2_dialyse: p2_dialyse ? "true" : "",
          check_p2_hospiRecente: p2_hospiRecente ? "true" : "",
          check_p2_antibio7j: p2_antibio7j ? "true" : "",
          text_p2_antibioLequel: p2_antibioLequel,
          // Page 2 — Plaie / Pus
          text_p2_plaie_date: p2_plaie_date,
          text_p2_plaie_heure: p2_plaie_heure,
          text_p2_plaie_aspect: p2_plaie_aspect,
          text_p2_plaie_localisation: p2_plaie_localisation,
          text_p2_plaie_contexte: p2_plaie_contexte,
          // Page 2 — Selles
          check_p2_coproculture: p2_coproculture ? "true" : "",
          check_p2_parasitologie: p2_parasitologie ? "true" : "",
          check_p2_sangSelles: p2_sangSelles ? "true" : "",
          text_p2_selles_date: p2_selles_date,
          text_p2_selles_heure: p2_selles_heure,
          check_p2_diarrhees: p2_diarrhees ? "true" : "",
          check_p2_douleursIntestinales: p2_douleursIntestinales ? "true" : "",
          check_p2_constipation: p2_constipation ? "true" : "",
          text_p2_sellesAutre: p2_sellesAutre,
          text_p2_voyageZone: p2_voyageZone,
          check_p2_medecineTravail: p2_medecineTravail ? "true" : "",
          // Page 2 — Hémocultures
          check_p2_H1: p2_H1 ? "true" : "",
          check_p2_H2: p2_H2 ? "true" : "",
          check_p2_H3: p2_H3 ? "true" : "",
          check_p2_prelevPeripherique: p2_prelevPeripherique ? "true" : "",
          check_p2_prelevCatheter: p2_prelevCatheter ? "true" : "",
          text_p2_hemo_date: p2_hemo_date,
          text_p2_hemo_heure: p2_hemo_heure,
          text_p2_fievreTemp: p2_fievreTemp,
          check_p2_suspicionEndocardite: p2_suspicionEndocardite ? "true" : "",
          // Page 2 — Autres
          text_p2_autres_date: p2_autres_date,
          text_p2_autres_heure: p2_autres_heure,
          text_p2_autres_nature: p2_autres_nature,
          text_p2_autres_localisation: p2_autres_localisation,
          text_p2_autres_contexte: p2_autres_contexte,
          // Page 2 — Réception laboratoire
          text_p2_secretaire: p2_secretaire,
          text_p2_technicien: p2_technicien,
          text_p2_reception_date: p2_reception_date,
          text_p2_reception_heure: p2_reception_heure,
          // Page 2 — Non-conformité
          check_p2_nc_identPrelevement: p2_nc_identPrelevement ? "true" : "",
          check_p2_nc_ordonnance: p2_nc_ordonnance ? "true" : "",
          check_p2_nc_tubesTrop: p2_nc_tubesTrop ? "true" : "",
          check_p2_nc_tubesManquants: p2_nc_tubesManquants ? "true" : "",
          check_p2_nc_caillotHemolyse: p2_nc_caillotHemolyse ? "true" : "",
          check_p2_nc_tubesPerimes: p2_nc_tubesPerimes ? "true" : "",
          check_p2_nc_identPatient: p2_nc_identPatient ? "true" : "",
          check_p2_nc_prelevHeure: p2_nc_prelevHeure ? "true" : "",
          check_p2_nc_delai: p2_nc_delai ? "true" : "",
          check_p2_nc_delaiDerogation: p2_nc_delaiDerogation ? "true" : "",
          check_p2_nc_renseignementsCliniques: p2_nc_renseignementsCliniques ? "true" : "",
          text_p2_nc_autre: p2_nc_autre,
        },
      });

      toast({
        title: "PDF genere",
        description: `Fiche Cerballiance pour ${formatName(nomUsuel, prenoms)} — ${totalAnalyses} analyse(s)`,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de generer le PDF",
        variant: "destructive",
      });
    }
  };

  // --- Patient selector card ---
  const patientSelectorCard = (
    <Card className="glass rounded-xl border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="size-4 text-primary" />
          Selectionner un patient
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={patientSource} onValueChange={(v) => {
          setPatientSource(v as "ordofill" | "ordocal");
          setSelectedPatient(null);
          setSearchTerm("");
        }}>
          <TabsList className="w-full" data-testid="patient-source-tabs">
            <TabsTrigger value="ordofill" className="flex-1 text-xs" data-testid="tab-ordofill">
              <Users className="size-3 mr-1" />
              OrdoFill
            </TabsTrigger>
            <TabsTrigger value="ordocal" className="flex-1 text-xs" data-testid="tab-ordocal">
              <CalendarRange className="size-3 mr-1" />
              OrdoCAL
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="patient-search"
          />
        </div>
        {patientsLoading ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            Chargement des patients...
          </div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filteredPatients.slice(0, 20).map((p) => (
              <motion.button
                key={`${p.source}-${p.id}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${selectedPatient?.id === p.id && selectedPatient?.source === p.source ? "bg-primary/20 border border-primary/30" : "hover:bg-muted/50"}`}
                onClick={() => setSelectedPatient(p)}
                data-testid={`patient-${p.source}-${p.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatName(p.nom ?? "", p.prenom ?? "")}
                  </span>
                  {selectedPatient?.id === p.id && selectedPatient?.source === p.source && (
                    <UserCheck className="size-4 text-primary" />
                  )}
                </div>
                {p.date_naissance && (
                  <span className="text-xs text-muted-foreground">
                    Ne(e) le {p.date_naissance}
                  </span>
                )}
              </motion.button>
            ))}
            {filteredPatients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {patientSource === "ordofill"
                  ? "Aucun patient OrdoFill. Ajoutez-en via la page Patients."
                  : !ordocalUserId
                    ? "Compte OrdoCAL non lie. Allez dans Parametres."
                    : "Aucun patient OrdoCAL trouve."
                }
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // --- IDE card ---
  const ideCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="size-4 text-accent" />
          Preleveur (IDE)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nom</span>
          <span className="font-medium">{user?.fullName ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cabinet</span>
          <span className="font-medium text-right max-w-[180px] truncate">
            {user?.cabinetName ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tel</span>
          <span className="font-medium">{user?.phone ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">RPPS</span>
          <span className="font-medium">{user?.numeroRpps ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ADELI</span>
          <span className="font-medium">{user?.numeroAdeli ?? "—"}</span>
        </div>
      </CardContent>
    </Card>
  );

  // --- Patient identity card ---
  const patientIdentityCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Identite du patient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Nom</Label>
            <Input value={nomUsuel} onChange={(e) => setNomUsuel(e.target.value)} placeholder="Nom usuel" className="h-8 text-sm" data-testid="field-nom" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prénom</Label>
            <Input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} placeholder="Prenoms" className="h-8 text-sm" data-testid="field-prenom" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date de naissance</Label>
            <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="h-8 text-sm" data-testid="field-dob" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sexe</Label>
            <Select value={sexe} onValueChange={setSexe}>
              <SelectTrigger className="h-8 text-sm" data-testid="field-sexe"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Homme</SelectItem>
                <SelectItem value="F">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Adresse</Label>
          <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse complète" className="h-8 text-sm" data-testid="field-adresse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Téléphone</Label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06..." className="h-8 text-sm" data-testid="field-tel" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">N° Sécurité Sociale</Label>
            <Input value={numSecu} onChange={(e) => setNumSecu(e.target.value)} placeholder="N°SS" className="h-8 text-sm" data-testid="field-ss" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Médecin traitant</Label>
            <Input value={medecinTraitant} onChange={(e) => setMedecinTraitant(e.target.value)} placeholder="Dr. ..." className="h-8 text-sm" data-testid="field-medecin" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prescripteur</Label>
            <div className="flex gap-1.5">
              <Input value={prescripteur} onChange={(e) => setPrescripteur(e.target.value)} placeholder="Dr. ..." className="h-8 text-sm flex-1" data-testid="field-prescripteur" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-primary"
                title="Copier le médecin traitant"
                onClick={() => setPrescripteur(medecinTraitant)}
                disabled={!medecinTraitant}
                data-testid="copy-medecin-to-prescripteur"
              >
                <CopyCheck className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Mutuelle</Label>
            <Input value={mutuelle} onChange={(e) => setMutuelle(e.target.value)} placeholder="Nom de la mutuelle" className="h-8 text-sm" data-testid="field-mutuelle" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fin de droit</Label>
            <Input type="date" value={finDeDroit} onChange={(e) => setFinDeDroit(e.target.value)} className="h-8 text-sm" data-testid="field-fin-droit" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Nom de naissance</Label>
            <Input value={nomNaissanceVal} onChange={(e) => setNomNaissanceVal(e.target.value)} placeholder="Si différent" className="h-8 text-sm" data-testid="field-nom-naissance" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lieu de naissance</Label>
            <Input value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} placeholder="Ville" className="h-8 text-sm" data-testid="field-lieu-naissance" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Établissement de soins</Label>
            <Input value={etablissementSoins} onChange={(e) => setEtablissementSoins(e.target.value)} placeholder="Nom" className="h-8 text-sm" data-testid="field-etablissement" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Demande d'étiquettes</Label>
            <Input value={demandeEtiquettes} onChange={(e) => setDemandeEtiquettes(e.target.value)} placeholder="Nombre" className="h-8 text-sm" data-testid="field-etiquettes" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // --- Résultats card ---
  const resultatsCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Résultats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Médecin */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Médecin</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resMedFaxer} onCheckedChange={(v) => setResMedFaxer(!!v)} data-testid="check-med-faxer" />
              à Faxer
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resMedTelephoner} onCheckedChange={(v) => setResMedTelephoner(!!v)} data-testid="check-med-tel" />
              à téléphoner
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resMedPoster} onCheckedChange={(v) => setResMedPoster(!!v)} data-testid="check-med-poster" />
              à poster
            </label>
          </div>
        </div>
        {/* IDE */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">IDE</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resIdeTelephoner} onCheckedChange={(v) => setResIdeTelephoner(!!v)} data-testid="check-ide-tel" />
              à téléphoner
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resIdeSms} onCheckedChange={(v) => setResIdeSms(!!v)} data-testid="check-ide-sms" />
              SMS (avec consentement patient)
            </label>
          </div>
        </div>
        {/* Patient */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Patient</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resPatLabo} onCheckedChange={(v) => setResPatLabo(!!v)} data-testid="check-pat-labo" />
              au laboratoire
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resPatInternet} onCheckedChange={(v) => setResPatInternet(!!v)} data-testid="check-pat-internet" />
              Internet
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={resPatSms} onCheckedChange={(v) => setResPatSms(!!v)} data-testid="check-pat-sms" />
              SMS
            </label>
          </div>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={resPatOppose} onCheckedChange={(v) => setResPatOppose(!!v)} data-testid="check-pat-oppose" />
            Le patient s'oppose à la communication de résultats à l'IDE
          </label>
        </div>
      </CardContent>
    </Card>
  );

  // --- Pièce justificative card ---
  const pieceJustificativeCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Pièce justificative</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={pieceCni} onCheckedChange={(v) => setPieceCni(!!v)} data-testid="check-cni" />
            CNI
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={piecePasseport} onCheckedChange={(v) => setPiecePasseport(!!v)} data-testid="check-passeport" />
            Passeport
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={pieceTitre} onCheckedChange={(v) => setPieceTitre(!!v)} data-testid="check-titre" />
            Titre ou carte de séjour
          </label>
        </div>
      </CardContent>
    </Card>
  );

  // --- Prescription card ---
  const prescriptionCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Prescription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(v === true)} data-testid="field-urgent" />
            Urgent
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={controleDemande} onCheckedChange={(v) => setControleDemande(!!v)} data-testid="check-controle" />
            Contrôle demandé
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={renouvelable} onCheckedChange={(v) => setRenouvelable(v === true)} data-testid="field-renouvelable" />
            Renouvelable
          </label>
          <Input
            type="date"
            value={dateRenouvelable}
            onChange={(e) => setDateRenouvelable(e.target.value)}
            className="h-8 text-sm w-auto"
            data-testid="field-date-renouvelable"
          />
        </div>
      </CardContent>
    </Card>
  );

  // --- Prelevement card ---
  const prelevementCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Prélèvement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={datePrelevement} onChange={(e) => setDatePrelevement(e.target.value)} className="h-8 text-sm" data-testid="field-date-prelev" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={heurePrelevement} onChange={(e) => setHeurePrelevement(e.target.value)} className="h-8 text-sm" data-testid="field-heure-prelev" />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={grossesse} onCheckedChange={(v) => setGrossesse(v === true)} />
            Grossesse
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={fievre} onCheckedChange={(v) => setFievre(v === true)} />
            Fievre
          </label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Traitements en cours</Label>
          <Input value={traitements} onChange={(e) => setTraitements(e.target.value)} placeholder="Traitements, pathologies..." className="h-8 text-sm" data-testid="field-traitements" />
        </div>
        {/* Pathologie connue (combo: checkbox + text) */}
        <div className="space-y-1">
          <Label className="text-xs">Pathologie connue</Label>
          <div className="flex items-center gap-2">
            <Checkbox checked={pathologieConnue} onCheckedChange={(v) => setPathologieConnue(!!v)} data-testid="check-pathologie-connue" />
            <Input value={pathologieConnueTexte} onChange={(e) => setPathologieConnueTexte(e.target.value)} placeholder="Préciser..." className="h-8 text-sm flex-1" data-testid="field-pathologie-connue-texte" />
          </div>
        </div>
        {/* Renseignements cliniques détaillés */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueChimiotherapie} onCheckedChange={(v) => setCliniqueChimiotherapie(!!v)} />Chimiothérapie</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueAntibiotherapie} onCheckedChange={(v) => setCliniqueAntibiotherapie(!!v)} />Antibiothérapie</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueDialyse} onCheckedChange={(v) => setCliniqueDialyse(!!v)} />Dialyse</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueSuiviHemopathie} onCheckedChange={(v) => setCliniqueSuiviHemopathie(!!v)} />Suivi hémopathie</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueTraitementEPO} onCheckedChange={(v) => setCliniqueTraitementEPO(!!v)} />Traitement EPO</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={cliniqueTransfusion4mois} onCheckedChange={(v) => setCliniqueTransfusion4mois(!!v)} />Transfusion &lt; 4 mois</label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Injection récente Rhophylac</Label>
          <div className="flex items-center gap-2">
            <Checkbox checked={cliniqueInjectionRhophylac} onCheckedChange={(v) => setCliniqueInjectionRhophylac(!!v)} />
            <Input type="date" value={cliniqueRhophylacDate} onChange={(e) => setCliniqueRhophylacDate(e.target.value)} className="h-8 text-sm flex-1" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Médicaments — date et heure dernière prise</Label>
          <Input value={cliniqueMedicamentsDateHeure} onChange={(e) => setCliniqueMedicamentsDateHeure(e.target.value)} placeholder="Date et heure..." className="h-8 text-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date dernières règles</Label>
            <Input type="date" value={cliniqueDateDernieresRegles} onChange={(e) => setCliniqueDateDernieresRegles(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Autres renseignements</Label>
            <Input value={cliniqueAutres} onChange={(e) => setCliniqueAutres(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={sansGarrot} onCheckedChange={(v) => setSansGarrot(!!v)} data-testid="check-sans-garrot" />
            Sans garrot
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={veinesDifficiles} onCheckedChange={(v) => setVeinesDifficiles(!!v)} data-testid="check-veines-difficiles" />
            Veines difficiles
          </label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autres (prélèvement)</Label>
          <Input value={prelevementAutres} onChange={(e) => setPrelevementAutres(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" data-testid="field-prelevement-autres" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nombre de tubes</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <Input type="number" min="0" value={nbTubesBleu} onChange={(e) => setNbTubesBleu(e.target.value)} placeholder="0" className="h-7 text-sm w-full" data-testid="field-nb-tubes-bleu" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
              <Input type="number" min="0" value={nbTubesJaune} onChange={(e) => setNbTubesJaune(e.target.value)} placeholder="0" className="h-7 text-sm w-full" data-testid="field-nb-tubes-jaune" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
              <Input type="number" min="0" value={nbTubesViolet} onChange={(e) => setNbTubesViolet(e.target.value)} placeholder="0" className="h-7 text-sm w-full" data-testid="field-nb-tubes-violet" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
              <Input type="number" min="0" value={nbTubesGris} onChange={(e) => setNbTubesGris(e.target.value)} placeholder="0" className="h-7 text-sm w-full" data-testid="field-nb-tubes-gris" />
            </div>
          </div>
        </div>
        {/* Tube Gris GPP enrichment */}
        <div className="border-t border-border/30 pt-2 space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Tube Gris — GPP</Label>
          <div className="space-y-1">
            <Label className="text-xs">Préciser heure</Label>
            <Input value={gppHeure} onChange={(e) => setGppHeure(e.target.value)} placeholder="Heure" className="h-8 text-sm" data-testid="field-gpp-heure" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={gppApresDejeuner} onCheckedChange={(v) => setGppApresDejeuner(!!v)} data-testid="check-gpp-apres-dejeuner" />
              Après déjeuner
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={gppApresPetitDejeuner} onCheckedChange={(v) => setGppApresPetitDejeuner(!!v)} data-testid="check-gpp-apres-petit-dejeuner" />
              Après petit déjeuner
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // --- Anticoagulant card ---
  const anticoagulantCard = (
    <Card className="glass rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Anticoagulant (si INR/TP)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedAnticoagulant} onValueChange={setSelectedAnticoagulant}>
          <SelectTrigger className="h-8 text-sm" data-testid="field-anticoagulant"><SelectValue placeholder="Aucun anticoagulant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {ANTICOAGULANTS.map((a) => (<SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {selectedAnticoagulant && selectedAnticoagulant !== "none" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Posologie</Label>
              <Input value={posologie} onChange={(e) => setPosologie(e.target.value)} placeholder="Dose" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">INR cible</Label>
              <Select value={inrCible} onValueChange={setInrCible}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2-3">INR cible 2-3</SelectItem>
                  <SelectItem value="3-4.5">INR cible 3-4,5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // --- Custom fields card ---
  const customTextFields = Object.entries(customFields).filter(([, f]) => f.type === "text");
  const customCheckFields = Object.entries(customFields).filter(([, f]) => f.type === "check");
  const customComboFields = Object.entries(customFields).filter(([, f]) => f.type === "combo");
  const customComboDateFields = Object.entries(customFields).filter(([, f]) => f.type === "combo_date");
  const hasCustomFields = customTextFields.length > 0 || customCheckFields.length > 0 || customComboFields.length > 0 || customComboDateFields.length > 0;

  const customFieldsCard = hasCustomFields ? (
    <Card className="glass rounded-xl border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Puzzle className="size-4 text-purple-400" />
          Champs personnalises
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customTextFields.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Type className="size-3" />
              Texte
            </div>
            {customTextFields.map(([key, field]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  value={customFieldValues[key] ?? ""}
                  onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={field.label}
                  className="h-8 text-sm"
                  data-testid={`custom-field-${key}`}
                />
              </div>
            ))}
          </div>
        )}
        {customCheckFields.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckSquare className="size-3" />
              Cases a cocher
            </div>
            <div className="flex flex-wrap gap-2">
              {customCheckFields.map(([key, field]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={customFieldValues[key] === "true"}
                    onCheckedChange={(v) => setCustomFieldValues((prev) => ({
                      ...prev,
                      [key]: v === true ? "true" : "",
                    }))}
                    data-testid={`custom-check-${key}`}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
        )}
        {customComboFields.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckSquare className="size-3" />
              <Type className="size-3" />
              Combo (X + Texte)
            </div>
            {customComboFields.map(([key, field]) => {
              const order = field.comboOrder ?? "check_text";
              const isChecked = customFieldValues[`${key}:checked`] === "true";
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <div className={`flex items-center gap-2 ${order === "text_check" ? "flex-row-reverse justify-end" : ""}`}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => setCustomFieldValues((prev) => ({
                        ...prev,
                        [`${key}:checked`]: v === true ? "true" : "",
                      }))}
                      data-testid={`combo-check-${key}`}
                    />
                    <Input
                      value={customFieldValues[key] ?? ""}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={field.label}
                      className="h-8 text-sm flex-1"
                      data-testid={`combo-text-${key}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {customComboDateFields.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckSquare className="size-3" />
              <CalendarRange className="size-3" />
              Combo (X + Date)
            </div>
            {customComboDateFields.map(([key, field]) => {
              const order = field.comboOrder ?? "check_text";
              const isChecked = customFieldValues[`${key}:checked`] === "true";
              const rawDate = customFieldValues[key] ?? "";
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <div className={`flex items-center gap-2 ${order === "text_check" ? "flex-row-reverse justify-end" : ""}`}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => setCustomFieldValues((prev) => ({
                        ...prev,
                        [`${key}:checked`]: v === true ? "true" : "",
                      }))}
                      data-testid={`combo-date-check-${key}`}
                    />
                    <Input
                      type="date"
                      value={rawDate}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="h-8 text-sm flex-1"
                      data-testid={`combo-date-input-${key}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  ) : null;

  // --- Page 2 collapsible section helper ---
  const p2Section = (id: string, title: string, content: React.ReactNode) => {
    const isCollapsed = p2CollapsedSections.has(id);
    return (
      <Card className="glass rounded-xl">
        <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => toggleP2Section(id)}>
          <CardTitle className="text-sm">{title}</CardTitle>
          {isCollapsed ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronUp className="size-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <CardContent className="pt-0 space-y-3">{content}</CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  // --- Page 2 sections ---
  const page2Panel = (
    <div className="space-y-3" data-testid="page2-panel">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
        <FileText className="size-4 text-primary" />
        Page 2 — Analyses urinaires & bactériologiques
      </h2>

      {p2Section("p2_rc_urinaires", "Renseignements cliniques urinaires", <>
        <div className="space-y-1">
          <Label className="text-xs">Antibiotique en cours</Label>
          <Input value={p2_antibio} onChange={(e) => setP2Antibio(e.target.value)} placeholder="Lequel..." className="h-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={p2_chimiotherapie} onCheckedChange={(v) => setP2Chimiotherapie(!!v)} />
            Chimiothérapie
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={p2_fievreUrines} onCheckedChange={(v) => setP2FievreUrines(!!v)} />
            Fièvre
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={p2_grossesseUrines} onCheckedChange={(v) => setP2GrossesseUrines(!!v)} />
            Grossesse
          </label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autre</Label>
          <Input value={p2_autreRcUrinaire} onChange={(e) => setP2AutreRcUrinaire(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
        </div>
      </>)}

      {p2Section("p2_biochimie_urinaire", "Biochimie urinaire", <>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={p2_24h} onCheckedChange={(v) => setP2_24h(!!v)} />
            24h
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={p2_echantillon} onCheckedChange={(v) => setP2Echantillon(!!v)} />
            Échantillon
          </label>
        </div>
        {p2_24h && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date début</Label>
              <Input type="date" value={p2_24h_dateDebut} onChange={(e) => setP2_24hDateDebut(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date fin</Label>
              <Input type="date" value={p2_24h_dateFin} onChange={(e) => setP2_24hDateFin(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Diurèse (mL)</Label>
              <Input value={p2_diurese} onChange={(e) => setP2Diurese(e.target.value)} placeholder="mL" className="h-8 text-sm" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_proteinurie} onCheckedChange={(v) => setP2Proteinurie(!!v)} />Protéinurie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_glycosurie} onCheckedChange={(v) => setP2Glycosurie(!!v)} />Glycosurie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_microAlbuminurie} onCheckedChange={(v) => setP2MicroAlbuminurie(!!v)} />Micro-albuminurie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_ionoUrinaire} onCheckedChange={(v) => setP2IonoUrinaire(!!v)} />Iono urinaire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_ureeUrinaire} onCheckedChange={(v) => setP2UreeUrinaire(!!v)} />Urée urinaire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_acUriqueUrinaire} onCheckedChange={(v) => setP2AcUriqueUrinaire(!!v)} />Ac. urique urinaire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_creatinineUrinaire} onCheckedChange={(v) => setP2CreatinineUrinaire(!!v)} />Créatinine urinaire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_calciumUrinaire} onCheckedChange={(v) => setP2CalciumUrinaire(!!v)} />Calcium urinaire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_phosphoreUrinaire} onCheckedChange={(v) => setP2PhosphoreUrinaire(!!v)} />Phosphore urinaire</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={p2_biochimieAutre} onCheckedChange={(v) => setP2BiochimieAutre(!!v)} />
          <Input value={p2_biochimieAutreTexte} onChange={(e) => setP2BiochimieAutreTexte(e.target.value)} placeholder="Autre biochimie..." className="h-8 text-sm flex-1" />
        </div>
      </>)}

      {p2Section("p2_ecbu", "ECBU — Type de recueil", <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={p2_ecbu_date} onChange={(e) => setP2EcbuDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={p2_ecbu_heure} onChange={(e) => setP2EcbuHeure(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_2emeJet} onCheckedChange={(v) => setP2_2emeJet(!!v)} />2ème jet</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_apresChangementSonde} onCheckedChange={(v) => setP2ApresChangementSonde(!!v)} />Après changement sonde</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_sondage} onCheckedChange={(v) => setP2Sondage(!!v)} />Sondage</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_collecteurBebe} onCheckedChange={(v) => setP2CollecteurBebe(!!v)} />Collecteur bébé</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_collecteurPenien} onCheckedChange={(v) => setP2CollecteurPenien(!!v)} />Collecteur pénien</label>
        </div>
        {/* Sur sonde à demeure (combo: checkbox + type text) — correction #6 */}
        <div className="flex items-center gap-2">
          <Checkbox checked={p2_surSonde} onCheckedChange={(v) => setP2SurSonde(!!v)} />
          <span className="text-xs whitespace-nowrap">Sur sonde à demeure</span>
          <Input value={p2_surSondeType} onChange={(e) => setP2SurSondeType(e.target.value)} placeholder="Type..." className="h-8 text-sm flex-1" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autre</Label>
          <Input value={p2_ecbuAutre} onChange={(e) => setP2EcbuAutre(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
        </div>
      </>)}

      {p2Section("p2_rc_ecbu", "Renseignements cliniques ECBU", <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_fievreEcbu} onCheckedChange={(v) => setP2FievreEcbu(!!v)} />Fièvre</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_douleursPubiennes} onCheckedChange={(v) => setP2DouleursPubiennes(!!v)} />Douleurs pubiennes</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_brulure} onCheckedChange={(v) => setP2Brulure(!!v)} />Brûlure</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_douleursMictionnelles} onCheckedChange={(v) => setP2DouleursMictionnelles(!!v)} />Douleurs mictionnelles</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_pollakiurie} onCheckedChange={(v) => setP2Pollakiurie(!!v)} />Pollakiurie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_ecoulement} onCheckedChange={(v) => setP2Ecoulement(!!v)} />Écoulement</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_douleursLombaires} onCheckedChange={(v) => setP2DouleursLombaires(!!v)} />Douleurs lombaires</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_hematurieMacro} onCheckedChange={(v) => setP2HematurieMacro(!!v)} />Hématurie macro.</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_mictionsImperieuses} onCheckedChange={(v) => setP2MictionsImperieuses(!!v)} />Mictions impérieuses</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_absenceSignes} onCheckedChange={(v) => setP2AbsenceSignes(!!v)} />Absence de signes</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_dysurie} onCheckedChange={(v) => setP2Dysurie(!!v)} />Dysurie</label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autre motif</Label>
          <Input value={p2_autreMotifEcbu} onChange={(e) => setP2AutreMotifEcbu(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
        </div>
      </>)}

      {p2Section("p2_etat_physio", "État physiologique", <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_grossesseEtat} onCheckedChange={(v) => setP2GrossesseEtat(!!v)} />Grossesse</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_bilanPreop} onCheckedChange={(v) => setP2BilanPreop(!!v)} />Bilan pré-opératoire</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_chimiotherapieEtat} onCheckedChange={(v) => setP2ChimiotherapieEtat(!!v)} />Chimiothérapie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_greffe} onCheckedChange={(v) => setP2Greffe(!!v)} />Greffe</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_dialyse} onCheckedChange={(v) => setP2Dialyse(!!v)} />Dialyse</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_hospiRecente} onCheckedChange={(v) => setP2HospiRecente(!!v)} />Hospi. récente</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={p2_antibio7j} onCheckedChange={(v) => setP2Antibio7j(!!v)} />
          <span className="text-xs whitespace-nowrap">Antibiotique &lt; 7j</span>
          <Input value={p2_antibioLequel} onChange={(e) => setP2AntibioLequel(e.target.value)} placeholder="Lequel..." className="h-8 text-sm flex-1" />
        </div>
      </>)}

      {p2Section("p2_plaie_pus", "Plaie / Pus", <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={p2_plaie_date} onChange={(e) => setP2PlaieDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={p2_plaie_heure} onChange={(e) => setP2PlaieHeure(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Aspect</Label>
          <Input value={p2_plaie_aspect} onChange={(e) => setP2PlaieAspect(e.target.value)} placeholder="Aspect..." className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Localisation</Label>
          <Input value={p2_plaie_localisation} onChange={(e) => setP2PlaieLocalisation(e.target.value)} placeholder="Localisation..." className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contexte</Label>
          <Input value={p2_plaie_contexte} onChange={(e) => setP2PlaieContexte(e.target.value)} placeholder="Contexte..." className="h-8 text-sm" />
        </div>
      </>)}

      {p2Section("p2_selles", "Selles", <>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_coproculture} onCheckedChange={(v) => setP2Coproculture(!!v)} />Coproculture</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_parasitologie} onCheckedChange={(v) => setP2Parasitologie(!!v)} />Parasitologie</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_sangSelles} onCheckedChange={(v) => setP2SangSelles(!!v)} />Sang dans les selles</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={p2_selles_date} onChange={(e) => setP2SellesDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={p2_selles_heure} onChange={(e) => setP2SellesHeure(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_diarrhees} onCheckedChange={(v) => setP2Diarrhees(!!v)} />Diarrhées</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_douleursIntestinales} onCheckedChange={(v) => setP2DouleursIntestinales(!!v)} />Douleurs intestinales</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_constipation} onCheckedChange={(v) => setP2Constipation(!!v)} />Constipation</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_medecineTravail} onCheckedChange={(v) => setP2MedecineTravail(!!v)} />Médecine du travail</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Autre</Label>
            <Input value={p2_sellesAutre} onChange={(e) => setP2SellesAutre(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Voyage / Zone</Label>
            <Input value={p2_voyageZone} onChange={(e) => setP2VoyageZone(e.target.value)} placeholder="Zone géographique..." className="h-8 text-sm" />
          </div>
        </div>
      </>)}

      {p2Section("p2_hemocultures", "Hémocultures", <>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_H1} onCheckedChange={(v) => setP2H1(!!v)} />H1</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_H2} onCheckedChange={(v) => setP2H2(!!v)} />H2</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_H3} onCheckedChange={(v) => setP2H3(!!v)} />H3</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_prelevPeripherique} onCheckedChange={(v) => setP2PrelevPeripherique(!!v)} />Périphérique</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_prelevCatheter} onCheckedChange={(v) => setP2PrelevCatheter(!!v)} />Cathéter</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_suspicionEndocardite} onCheckedChange={(v) => setP2SuspicionEndocardite(!!v)} />Suspicion endocardite</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={p2_hemo_date} onChange={(e) => setP2HemoDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={p2_hemo_heure} onChange={(e) => setP2HemoHeure(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fièvre T°</Label>
            <Input type="number" step="0.1" value={p2_fievreTemp} onChange={(e) => setP2FievreTemp(e.target.value)} placeholder="38.5" className="h-8 text-sm" />
          </div>
        </div>
      </>)}

      {p2Section("p2_autres", "Autres prélèvements", <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={p2_autres_date} onChange={(e) => setP2AutresDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={p2_autres_heure} onChange={(e) => setP2AutresHeure(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nature</Label>
          <Input value={p2_autres_nature} onChange={(e) => setP2AutresNature(e.target.value)} placeholder="Nature..." className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Localisation</Label>
          <Input value={p2_autres_localisation} onChange={(e) => setP2AutresLocalisation(e.target.value)} placeholder="Localisation..." className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contexte</Label>
          <Input value={p2_autres_contexte} onChange={(e) => setP2AutresContexte(e.target.value)} placeholder="Contexte..." className="h-8 text-sm" />
        </div>
      </>)}

      {p2Section("p2_reception", "Réception laboratoire", <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Secrétaire</Label>
            <Input value={p2_secretaire} onChange={(e) => setP2Secretaire(e.target.value)} placeholder="Nom" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Technicien</Label>
            <Input value={p2_technicien} onChange={(e) => setP2Technicien(e.target.value)} placeholder="Nom" className="h-8 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date réception</Label>
            <Input type="date" value={p2_reception_date} onChange={(e) => setP2ReceptionDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Heure réception</Label>
            <Input type="time" value={p2_reception_heure} onChange={(e) => setP2ReceptionHeure(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </>)}

      {p2Section("p2_non_conformite", "Non-conformité", <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_identPrelevement} onCheckedChange={(v) => setP2NcIdentPrelevement(!!v)} />Ident. prélèvement</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_ordonnance} onCheckedChange={(v) => setP2NcOrdonnance(!!v)} />Ordonnance</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_tubesTrop} onCheckedChange={(v) => setP2NcTubesTrop(!!v)} />Tubes en trop</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_tubesManquants} onCheckedChange={(v) => setP2NcTubesManquants(!!v)} />Tubes manquants</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_caillotHemolyse} onCheckedChange={(v) => setP2NcCaillotHemolyse(!!v)} />Caillot/Hémolyse</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_tubesPerimes} onCheckedChange={(v) => setP2NcTubesPerimes(!!v)} />Tubes périmés</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_identPatient} onCheckedChange={(v) => setP2NcIdentPatient(!!v)} />Ident. patient</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_prelevHeure} onCheckedChange={(v) => setP2NcPrelevHeure(!!v)} />Prélèv./Heure</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_delai} onCheckedChange={(v) => setP2NcDelai(!!v)} />Délai</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_delaiDerogation} onCheckedChange={(v) => setP2NcDelaiDerogation(!!v)} />Délai (dérogation)</label>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={p2_nc_renseignementsCliniques} onCheckedChange={(v) => setP2NcRenseignementsCliniques(!!v)} />Rens. cliniques</label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Autre NC</Label>
          <Input value={p2_nc_autre} onChange={(e) => setP2NcAutre(e.target.value)} placeholder="Préciser..." className="h-8 text-sm" />
        </div>
      </>)}
    </div>
  );

  // --- Analyses panel ---
  const analysesPanel = (
    <div className="space-y-3" data-testid="analyses-panel">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <TestTubes className="size-4 text-primary" />
          Analyses sanguines
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalAnalyses} selectionnee{totalAnalyses > 1 ? "s" : ""}
        </span>
      </div>

      {TUBE_SECTIONS.map((section, sectionIdx) => {
        const isCollapsed = collapsedSections.has(sectionIdx);
        const sectionCount = section.analyses.filter((a) => selectedAnalyses.has(a.id)).length;

        return (
          <motion.div key={section.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sectionIdx * 0.04 }} className={`rounded-xl border ${section.borderColor} ${section.bgColor} overflow-hidden`}>
            <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => toggleSection(sectionIdx)} data-testid={`section-toggle-${sectionIdx}`}>
              <div className="flex items-center gap-2">
                <span>{section.icon}</span>
                <span className={`text-sm font-medium ${section.textColor}`}>{section.label}</span>
                {sectionCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5" style={{ backgroundColor: section.color + "30", color: section.color }}>{sectionCount}</Badge>
                )}
              </div>
              {isCollapsed ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronUp className="size-4 text-muted-foreground" />}
            </button>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                      {section.analyses.map((analysis) => {
                        const isChecked = selectedAnalyses.has(analysis.id);
                        return (
                          <label key={analysis.id} className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors ${isChecked ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground"}`} data-testid={`analysis-${analysis.id.replace(/\s/g, "-")}`}>
                            <Checkbox checked={isChecked} onCheckedChange={() => toggleAnalysis(analysis.id)} className="size-3.5" />
                            <span className="leading-tight">{analysis.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col" data-testid="fiche-labo-page">
      {/* Header bar */}
      <div className="p-3 sm:p-4 border-b glass-strong flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-base sm:text-lg font-semibold">Fiche Labo</h1>
        </div>
        {totalAnalyses > 0 && (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {totalAnalyses} analyse{totalAnalyses > 1 ? "s" : ""}
          </Badge>
        )}
        {urgent && (
          <Badge variant="destructive" className="animate-pulse">
            <AlertCircle className="size-3 mr-1" />
            URGENT
          </Badge>
        )}
        <div className="ml-auto flex gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDrafts(getDrafts()); setDraftsOpen(true); }}
            data-testid="drafts-btn"
            className="text-xs"
          >
            <FileText className="size-4 mr-1" />
            <span className="hidden sm:inline">Brouillons</span>
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{drafts.length}</Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            data-testid="save-draft-btn"
            className="text-xs"
          >
            <Save className="size-4 mr-1" />
            <span className="hidden sm:inline">Sauvegarder</span>
          </Button>
          <Link href="/calibration">
            <Button
              variant="ghost"
              size="sm"
              data-testid="calibrate-btn"
              className="text-xs"
            >
              <Crosshair className="size-4 mr-1" />
              <span className="hidden sm:inline">Calibrer</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            data-testid="print-btn"
            className="text-xs"
          >
            <Printer className="size-4 mr-1" />
            <span className="hidden sm:inline">Imprimer</span>
          </Button>
          <Button
            size="sm"
            onClick={handleGeneratePDF}
            className="bg-gradient-to-r from-primary to-accent text-white pulse-glow text-xs"
            disabled={!nomUsuel}
            data-testid="generate-pdf-btn"
          >
            <Download className="size-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="sm:hidden p-2 border-b">
        <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as "patient" | "analyses" | "page2")}>
          <TabsList className="w-full">
            <TabsTrigger value="patient" className="flex-1 text-xs">
              <Users className="size-3 mr-1" />
              Patient
            </TabsTrigger>
            <TabsTrigger value="analyses" className="flex-1 text-xs">
              <TestTubes className="size-3 mr-1" />
              Analyses
              {totalAnalyses > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totalAnalyses}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="page2" className="flex-1 text-xs">
              <FileText className="size-3 mr-1" />
              Page 2
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex">
        {/* Left panel: Patient (visible on desktop always, on mobile when patient tab active) */}
        <ScrollArea className={`${mobileView === "patient" ? "block" : "hidden"} sm:block w-full sm:w-[380px] sm:min-w-[340px] sm:border-r`}>
          <div className="p-3 sm:p-4 space-y-4">
            {patientSelectorCard}
            {ideCard}
            {patientIdentityCard}
            {resultatsCard}
            {pieceJustificativeCard}
            {prescriptionCard}
            {prelevementCard}
            {anticoagulantCard}
            {customFieldsCard}
          </div>
        </ScrollArea>

        {/* Middle panel: Analyses (visible on desktop always, on mobile when analyses tab active) */}
        <ScrollArea className={`${mobileView === "analyses" ? "block" : "hidden"} sm:block flex-1 sm:border-r`}>
          <div className="p-3 sm:p-4">
            {analysesPanel}
          </div>
        </ScrollArea>

        {/* Right panel: Page 2 (visible on desktop always, on mobile when page2 tab active) */}
        <ScrollArea className={`${mobileView === "page2" ? "block" : "hidden"} sm:block w-full sm:w-[380px] sm:min-w-[340px]`}>
          <div className="p-3 sm:p-4">
            {page2Panel}
          </div>
        </ScrollArea>
      </div>

      {/* Drafts sheet */}
      <Sheet open={draftsOpen} onOpenChange={setDraftsOpen}>
        <SheetContent side="left" className="w-[320px] sm:w-[400px]" data-testid="drafts-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Brouillons ({drafts.length})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Button variant="outline" size="sm" className="w-full" onClick={handleNewForm} data-testid="new-form-btn">
              Nouveau formulaire
            </Button>
            {drafts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun brouillon sauvegarde
              </p>
            )}
            {drafts.map((d) => (
              <Card key={d.id} className={`glass rounded-lg ${d.id === currentDraftId ? "border-primary/50" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="flex-1 text-left"
                      onClick={() => handleLoadDraft(d)}
                      data-testid={`draft-${d.id}`}
                    >
                      <p className="text-sm font-medium">{d.patientName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="size-3" />
                        {new Date(d.updatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {d.data.selectedAnalyses.length} analyse(s)
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive shrink-0"
                      onClick={() => handleDeleteDraft(d.id)}
                      data-testid={`delete-draft-${d.id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
