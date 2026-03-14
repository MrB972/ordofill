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

/**
 * Build analyses list for a section from calibration data.
 * Only includes "check_" fields from the given section.
 * The analysis name = the key with "check_" prefix stripped.
 */
function getAnalysesFromCalibration(cal: CalibrationMap, sectionId: string): string[] {
  return Object.entries(cal)
    .filter(([key, field]) => field.section === sectionId && field.type === "check" && key.startsWith("check_"))
    .map(([key]) => key.replace(/^check_/, ""));
}

interface TubeSection {
  label: string;
  calibrationSectionId: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  analyses: string[];
  icon: string;
}

/** Anticoagulant names are derived from the 'anticoagulant' calibration section,
 *  excluding special keys (inr23, inr345). */
function getAnticoagulantsFromCalibration(cal: CalibrationMap): string[] {
  return Object.entries(cal)
    .filter(([key, field]) =>
      field.section === "anticoagulant" &&
      field.type === "check" &&
      key.startsWith("check_") &&
      !key.startsWith("check_inr")
    )
    .map(([key]) => key.replace(/^check_/, ""));
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
  const [mobileView, setMobileView] = useState<"patient" | "analyses">("patient");

  // Form fields
  const [nomUsuel, setNomUsuel] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [sexe, setSexe] = useState("");
  const [telephone, setTelephone] = useState("");
  const [numSecu, setNumSecu] = useState("");
  const [medecinTraitant, setMedecinTraitant] = useState("");

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

  // Anticoagulant
  const [selectedAnticoagulant, setSelectedAnticoagulant] = useState("");
  const [posologie, setPosologie] = useState("");
  const [inrCible, setInrCible] = useState("");

  // Analyses
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

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
    if (grossesse) checkSet.add("check_grossesse");
    if (fievre) checkSet.add("check_fievre");
    if (sexe === "M") checkSet.add("check_sexeH");
    if (sexe === "F") checkSet.add("check_sexeF");
    if (selectedAnticoagulant) checkSet.add(`check_${selectedAnticoagulant}`);
    if (inrCible === "2-3") checkSet.add("check_inr23");
    if (inrCible === "3-4.5" || inrCible === "3-4,5") checkSet.add("check_inr345");
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
      datePrelevement: formattedDP,
      heurePrelevement,
      grossesse,
      fievre,
      traitements,
      urgent,
      anticoagulant: selectedAnticoagulant,
      posologie,
      inrCible,
      selectedChecks: checkSet,
      customFieldValues,
    });
  }, [nomUsuel, prenoms, dateNaissance, adresse, sexe, telephone, numSecu,
    medecinTraitant, datePrelevement, heurePrelevement, grossesse, fievre,
    traitements, urgent, selectedAnticoagulant, posologie, inrCible,
    selectedAnalyses, user, customFieldValues]);

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

  const currentPatients = patientSource === "ordofill" ? unifiedOrdofill : unifiedOrdocal;
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
    datePrelevement,
    heurePrelevement,
    grossesse,
    fievre,
    traitements,
    urgent,
    selectedAnticoagulant,
    posologie,
    inrCible,
    selectedAnalyses: Array.from(selectedAnalyses),
    patientSource,
    patientId: selectedPatient?.id ?? null,
    customFieldValues,
  }), [nomUsuel, prenoms, dateNaissance, adresse, sexe, telephone, numSecu, medecinTraitant, datePrelevement, heurePrelevement, grossesse, fievre, traitements, urgent, selectedAnticoagulant, posologie, inrCible, selectedAnalyses, patientSource, selectedPatient, customFieldValues]);

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
    setDatePrelevement(d.datePrelevement);
    setHeurePrelevement(d.heurePrelevement);
    setGrossesse(d.grossesse);
    setFievre(d.fievre);
    setTraitements(d.traitements);
    setUrgent(d.urgent);
    setSelectedAnticoagulant(d.selectedAnticoagulant);
    setPosologie(d.posologie);
    setInrCible(d.inrCible);
    setSelectedAnalyses(new Set(d.selectedAnalyses));
    setCustomFieldValues(d.customFieldValues ?? {});
    setPatientSource(d.patientSource);
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
    setDatePrelevement(new Date().toISOString().slice(0, 10));
    setHeurePrelevement(new Date().toTimeString().slice(0, 5));
    setGrossesse(false);
    setFievre(false);
    setTraitements("");
    setUrgent(false);
    setSelectedAnticoagulant("");
    setPosologie("");
    setInrCible("");
    setSelectedAnalyses(new Set());
    setCustomFieldValues({});
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
        analyses: s.analyses.filter((a) => selectedAnalyses.has(a)),
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
        customFields: customFieldValues,
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
        <div className="space-y-1">
          <Label className="text-xs">Médecin traitant / Prescripteur</Label>
          <Input value={medecinTraitant} onChange={(e) => setMedecinTraitant(e.target.value)} placeholder="Dr. ..." className="h-8 text-sm" data-testid="field-medecin" />
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
            <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(v === true)} data-testid="field-urgent" />
            Urgent
          </label>
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
            {ANTICOAGULANTS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
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
  const hasCustomFields = customTextFields.length > 0 || customCheckFields.length > 0 || customComboFields.length > 0;

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
      </CardContent>
    </Card>
  ) : null;

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
        const sectionCount = section.analyses.filter((a) => selectedAnalyses.has(a)).length;

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
                        const isChecked = selectedAnalyses.has(analysis);
                        return (
                          <label key={analysis} className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors ${isChecked ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground"}`} data-testid={`analysis-${analysis.replace(/\s/g, "-")}`}>
                            <Checkbox checked={isChecked} onCheckedChange={() => toggleAnalysis(analysis)} className="size-3.5" />
                            <span className="leading-tight">{analysis}</span>
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
        <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as "patient" | "analyses")}>
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
            {prelevementCard}
            {anticoagulantCard}
            {customFieldsCard}
          </div>
        </ScrollArea>

        {/* Right panel: Analyses (visible on desktop always, on mobile when analyses tab active) */}
        <ScrollArea className={`${mobileView === "analyses" ? "block" : "hidden"} sm:block flex-1`}>
          <div className="p-3 sm:p-4">
            {analysesPanel}
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
