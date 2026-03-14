import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  UserCheck,
  Download,
  Printer,
  Sparkles,
  Stethoscope,
  FlaskConical,
  TestTubes,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Users,
  CalendarRange,
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
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";
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

// OrdoCAL patient type (snake_case from Supabase)
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

// Lab form sections
const TUBE_BLEU_ANALYSES = [
  "INR", "TCA", "Fibrine", "TP", "AT3",
  "Plaquettes sur tube citrate", "Ddimeres",
];

const TUBE_JAUNE_ANALYSES = [
  "ACE", "Acide urique", "AFP", "Ag HBS", "ALAT / ASAT", "Albumine",
  "Apo A / Apo B", "B2 microglobuline", "Bicarbonates", "Bilan hepatique",
  "Bilan lipidique", "Bilirubine", "CA 125", "CA 153.3", "CA 19.9",
  "Calcium / Calcium corrige", "CMV", "Cholesterol / triglycerides",
  "Coefficient de saturation", "Cortisol", "CPK", "Creatinine",
  "CRP / CRP us", "DHEAS", "DFG", "Estradiol", "Fer serique",
  "Ferritine", "Folates seriques", "Fructosamine", "GGT",
  "Hepatite A / B / C", "HIV", "HTLV", "IgA / IgG / IgM / IgE totales",
  "Ionogramme complet", "LDH", "Lipase", "Magnesium", "Na / K / Cl",
  "PAL", "Phosphore", "Prealbumine", "Progesterone", "Prolactine",
  "Protides", "PSA / PSA LIBRE", "PTH", "Rubeole", "Syphilis",
  "T3L / T4L", "Testosterone", "Toxoplasmose", "TSH", "Uree",
  "Vit B12", "Vit D",
];

const TUBE_JAUNE_PETIT_ANALYSES = [
  "ENA / AAN / ACADN", "Facteurs rhumatoides", "Latex Waaler-Rose",
];

const TUBE_VIOLET_ANALYSES = [
  "NFS", "VS", "Reticulocytes", "BNP", "HbA1C",
  "Plaquettes", "Electrophorese HB", "RAI", "Groupe sanguin",
];

const TUBE_GRIS_ANALYSES = [
  "Glycemie a Jeun", "GPP",
];

const TUBE_VERT_ANALYSES = [
  "Bicarbonates / Reserve alcaline",
];

const TUBE_ROUGE_ANALYSES = [
  "Chlordecone",
];

const SEROLOGIES = [
  "Serologie H.Pylori", "Serologie C.trachomatis IgG", "Procalcitonie",
];

const ANALYSES_CARDIAQUES = [
  "NTproBNP", "Troponine",
  "Electrophorese des protides / Immunotypage",
];

const ANTICOAGULANTS = [
  "Sintrom", "Previscan", "Coumadine", "Fraxi", "Lovenox",
  "Innohep", "Calciparine", "Orgaran", "Rivaroxaban", "Apixaban", "Dabigatran",
];

interface TubeSection {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  analyses: string[];
  icon: string;
}

const TUBE_SECTIONS: TubeSection[] = [
  { label: "Tube bleu (citrate)", color: "#3B82F6", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-400", analyses: TUBE_BLEU_ANALYSES, icon: "🟢" },
  { label: "Tube jaune 5mL", color: "#EAB308", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", textColor: "text-yellow-400", analyses: TUBE_JAUNE_ANALYSES, icon: "🟡" },
  { label: "Tube jaune 3.5mL (rhumato)", color: "#F59E0B", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", textColor: "text-amber-400", analyses: TUBE_JAUNE_PETIT_ANALYSES, icon: "🟠" },
  { label: "S\u00e9rologies", color: "#A855F7", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", textColor: "text-purple-400", analyses: SEROLOGIES, icon: "🟣" },
  { label: "Analyses cardiaques", color: "#EF4444", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-400", analyses: ANALYSES_CARDIAQUES, icon: "\u2764\ufe0f" },
  { label: "Tube violet EDTA", color: "#8B5CF6", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", textColor: "text-violet-400", analyses: TUBE_VIOLET_ANALYSES, icon: "🟣" },
  { label: "Tube gris", color: "#6B7280", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30", textColor: "text-gray-400", analyses: TUBE_GRIS_ANALYSES, icon: "\u26aa" },
  { label: "Tube vert", color: "#22C55E", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", textColor: "text-green-400", analyses: TUBE_VERT_ANALYSES, icon: "🟢" },
  { label: "Tube rouge (Chlordecone)", color: "#DC2626", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-400", analyses: TUBE_ROUGE_ANALYSES, icon: "🔴" },
];

export default function FicheLaboPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Patient selection
  const [searchTerm, setSearchTerm] = useState("");
  const [patientSource, setPatientSource] = useState<"ordofill" | "ordocal">("ordofill");
  const [selectedPatient, setSelectedPatient] = useState<UnifiedPatient | null>(null);

  // Form fields (auto-filled or manual)
  const [nomUsuel, setNomUsuel] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [adresse, setAdresse] = useState("");
  const [sexe, setSexe] = useState("");
  const [telephone, setTelephone] = useState("");
  const [numSecu, setNumSecu] = useState("");
  const [medecinTraitant, setMedecinTraitant] = useState("");

  // Prelevement info
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

  // Analyses checkboxes
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());

  // Collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // Fetch OrdoFill patients
  const { data: ordofillPatients = [], isLoading: ordofillLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch OrdoCAL patients (private per account via ordocalUserId)
  const ordocalUserId = user?.ordocalUserId;
  const { data: ordocalPatients = [], isLoading: ordocalLoading } = useQuery<OrdocalPatient[]>({
    queryKey: ["/api/ordocal/patients", ordocalUserId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!ordocalUserId,
  });

  // Convert OrdoFill patients to unified shape
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

  // Filter patients
  const filteredPatients = currentPatients.filter((p) => {
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
        title: "Patient selectionne",
        description: `${selectedPatient.prenom} ${selectedPatient.nom} \u2014 Donnees pre-remplies`,
      });
    }
  }, [selectedPatient]);

  const toggleAnalysis = (name: string) => {
    setSelectedAnalyses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleSection = (index: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const totalAnalyses = selectedAnalyses.size;

  const handleGeneratePDF = () => {
    toast({
      title: "Fiche generee",
      description: `${totalAnalyses} analyse(s) selectionnee(s) pour ${prenoms} ${nomUsuel}`,
    });
  };

  return (
    <div className="h-full flex flex-col" data-testid="fiche-labo-page">
      {/* Header bar */}
      <div className="p-4 border-b glass-strong flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Fiche Labo Cerballiance</h1>
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
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            data-testid="print-btn"
          >
            <Printer className="size-4 mr-2" />
            Imprimer
          </Button>
          <Button
            onClick={handleGeneratePDF}
            className="bg-gradient-to-r from-primary to-accent text-white pulse-glow"
            disabled={!nomUsuel}
            data-testid="generate-pdf-btn"
          >
            <Download className="size-4 mr-2" />
            Generer PDF
          </Button>
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: Patient selection + Identity */}
        <ScrollArea className="w-[380px] min-w-[340px] border-r">
          <div className="p-4 space-y-4">
            {/* Patient source toggle + search */}
            <Card className="glass rounded-xl border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Selectionner un patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Toggle OrdoFill / OrdoCAL */}
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
                            {p.prenom} {p.nom}
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
                            ? "Compte OrdoCAL non lie. Allez dans Parametres pour lier votre compte."
                            : "Aucun patient OrdoCAL trouve."
                        }
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* IDE Profile (auto-filled from user) */}
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
                  <span className="font-medium">{user?.fullName ?? "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cabinet</span>
                  <span className="font-medium text-right max-w-[180px] truncate">
                    {user?.cabinetName ?? "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tel</span>
                  <span className="font-medium">{user?.phone ?? "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RPPS</span>
                  <span className="font-medium">{user?.numeroRpps ?? "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ADELI</span>
                  <span className="font-medium">{user?.numeroAdeli ?? "\u2014"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Patient Identity Form */}
            <Card className="glass rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Identite du patient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input value={nomUsuel} onChange={(e) => setNomUsuel(e.target.value)} placeholder="Nom usuel" className="h-8 text-sm" data-testid="field-nom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prenom</Label>
                    <Input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} placeholder="Prenoms" className="h-8 text-sm" data-testid="field-prenom" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Date de naissance</Label>
                    <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="h-8 text-sm" data-testid="field-dob" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sexe</Label>
                    <Select value={sexe} onValueChange={setSexe}>
                      <SelectTrigger className="h-8 text-sm" data-testid="field-sexe"><SelectValue placeholder="\u2014" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Homme</SelectItem>
                        <SelectItem value="F">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Adresse</Label>
                  <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse complete" className="h-8 text-sm" data-testid="field-adresse" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Telephone</Label>
                    <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06..." className="h-8 text-sm" data-testid="field-tel" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">N\u00b0 Securite Sociale</Label>
                    <Input value={numSecu} onChange={(e) => setNumSecu(e.target.value)} placeholder="N\u00b0SS" className="h-8 text-sm" data-testid="field-ss" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Medecin traitant / Prescripteur</Label>
                  <Input value={medecinTraitant} onChange={(e) => setMedecinTraitant(e.target.value)} placeholder="Dr. ..." className="h-8 text-sm" data-testid="field-medecin" />
                </div>
              </CardContent>
            </Card>

            {/* Prelevement info */}
            <Card className="glass rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Prelevement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={datePrelevement} onChange={(e) => setDatePrelevement(e.target.value)} className="h-8 text-sm" data-testid="field-date-prelev" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Heure</Label>
                    <Input type="time" value={heurePrelevement} onChange={(e) => setHeurePrelevement(e.target.value)} className="h-8 text-sm" data-testid="field-heure-prelev" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
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

            {/* Anticoagulant section */}
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Posologie</Label>
                      <Input value={posologie} onChange={(e) => setPosologie(e.target.value)} placeholder="Dose" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">INR cible</Label>
                      <Select value={inrCible} onValueChange={setInrCible}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="\u2014" /></SelectTrigger>
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
          </div>
        </ScrollArea>

        {/* Right: Analyses checkboxes */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3" data-testid="analyses-panel">
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
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
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
        </ScrollArea>
      </div>
    </div>
  );
}
