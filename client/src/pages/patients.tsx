import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  User,
  Phone,
  MapPin,
  Mail,
  Trash2,
  RefreshCw,
  Loader2,
  CalendarRange,
  Users,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import type { Patient } from "@shared/schema";

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

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [detailOrdocal, setDetailOrdocal] = useState<OrdocalPatient | null>(null);
  const [editingOrdocal, setEditingOrdocal] = useState(false);
  const [ocNom, setOcNom] = useState("");
  const [ocPrenom, setOcPrenom] = useState("");
  const [ocTelephone, setOcTelephone] = useState("");
  const [ocDateNaissance, setOcDateNaissance] = useState("");
  const [ocAdresse, setOcAdresse] = useState("");
  const [ocVille, setOcVille] = useState("");
  const [ocCodePostal, setOcCodePostal] = useState("");
  const [ocNumSecu, setOcNumSecu] = useState("");
  const [ocGenre, setOcGenre] = useState("");
  const [ocMedecin, setOcMedecin] = useState("");
  const [ocNotes, setOcNotes] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [viewSource, setViewSource] = useState<"ordofill" | "ordocal">("ordofill");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [numeroSecuriteSociale, setNumeroSecuriteSociale] = useState("");
  const [medecinTraitant, setMedecinTraitant] = useState("");
  const [notes, setNotes] = useState("");

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // OrdoCAL patients
  const ordocalUserId = user?.ordocalUserId;
  const { data: ordocalPatients = [], isLoading: ordocalLoading } = useQuery<OrdocalPatient[]>({
    queryKey: ["/api/ordocal/patients", ordocalUserId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!ordocalUserId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateOrdocalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string | null> }) => {
      const res = await apiRequest("PATCH", `/api/ordocal/patients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordocal/patients"] });
    },
  });

  const openEditOrdocal = (p: OrdocalPatient) => {
    setOcNom(p.nom ?? "");
    setOcPrenom(p.prenom ?? "");
    setOcTelephone(p.telephone ?? "");
    setOcDateNaissance(p.date_naissance ?? "");
    setOcAdresse(p.adresse ?? "");
    setOcVille(p.ville ?? "");
    setOcCodePostal(p.code_postal ?? "");
    setOcNumSecu(p.numero_securite_sociale ?? "");
    setOcGenre(p.genre ?? "");
    setOcMedecin(p.medecin_traitant ?? "");
    setOcNotes(p.notes ?? "");
    setDetailOrdocal(p);
    setEditingOrdocal(true);
  };

  const handleSaveOrdocal = async () => {
    if (!detailOrdocal) return;
    const updates = {
      nom: ocNom,
      prenom: ocPrenom,
      telephone: ocTelephone || null,
      date_naissance: ocDateNaissance || null,
      adresse: ocAdresse || null,
      ville: ocVille || null,
      code_postal: ocCodePostal || null,
      numero_securite_sociale: ocNumSecu || null,
      genre: ocGenre || null,
      medecin_traitant: ocMedecin || null,
      notes: ocNotes || null,
    };
    await updateOrdocalMutation.mutateAsync({ id: detailOrdocal.id, data: updates });
    // Bi-directional sync: update matching OrdoFill patient if exists
    const matchingOrdofill = patients.find(
      (p) =>
        p.firstName.toLowerCase() === (detailOrdocal.prenom ?? "").toLowerCase() &&
        p.lastName.toLowerCase() === (detailOrdocal.nom ?? "").toLowerCase()
    );
    if (matchingOrdofill) {
      await updateMutation.mutateAsync({
        id: matchingOrdofill.id,
        data: {
          firstName: ocPrenom,
          lastName: ocNom,
          phone: ocTelephone,
          dateOfBirth: ocDateNaissance,
          address: ocAdresse,
          city: ocVille,
          postalCode: ocCodePostal,
          numeroSecuriteSociale: ocNumSecu,
          gender: ocGenre,
          medecinTraitant: ocMedecin,
          notes: ocNotes,
        },
      });
    }
    toast({ title: "Patient mis a jour", description: `${ocPrenom} ${ocNom} sauvegarde` });
    setDetailOrdocal(null);
    setEditingOrdocal(false);
  };

  // Sort alphabetically by last name then first name
  const sortedPatients = [...patients].sort((a, b) => {
    const cmp = (a.lastName ?? "").localeCompare(b.lastName ?? "", "fr", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.firstName ?? "").localeCompare(b.firstName ?? "", "fr", { sensitivity: "base" });
  });

  const sortedOrdocal = [...ordocalPatients].sort((a, b) => {
    const cmp = (a.nom ?? "").localeCompare(b.nom ?? "", "fr", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.prenom ?? "").localeCompare(b.prenom ?? "", "fr", { sensitivity: "base" });
  });

  // Deduplicate: remove OrdoFill patients that also exist in OrdoCal (by name)
  const ordocalNameSet = new Set(
    ordocalPatients.map(
      (p) => `${(p.nom ?? "").toLowerCase()}|${(p.prenom ?? "").toLowerCase()}`
    )
  );
  const deduplicatedOrdofill = sortedPatients.filter(
    (p) => !ordocalNameSet.has(`${(p.lastName ?? "").toLowerCase()}|${(p.firstName ?? "").toLowerCase()}`)
  );

  const filteredOrdofill = deduplicatedOrdofill.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.numeroSecuriteSociale?.includes(q)
    );
  });

  const filteredOrdocal = sortedOrdocal.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.nom ?? "").toLowerCase().includes(q) ||
      (p.prenom ?? "").toLowerCase().includes(q) ||
      p.ville?.toLowerCase().includes(q) ||
      p.numero_securite_sociale?.includes(q)
    );
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setGender("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setPostalCode("");
    setNumeroSecuriteSociale("");
    setMedecinTraitant("");
    setNotes("");
  };

  const openAdd = () => {
    setEditPatient(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditPatient(p);
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setDateOfBirth(p.dateOfBirth ?? "");
    setGender(p.gender ?? "");
    setPhone(p.phone ?? "");
    setEmail(p.email ?? "");
    setAddress(p.address ?? "");
    setCity(p.city ?? "");
    setPostalCode(p.postalCode ?? "");
    setNumeroSecuriteSociale(p.numeroSecuriteSociale ?? "");
    setMedecinTraitant(p.medecinTraitant ?? "");
    setNotes(p.notes ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      city,
      postalCode,
      numeroSecuriteSociale,
      medecinTraitant,
      notes,
    };
    if (editPatient) {
      await updateMutation.mutateAsync({ id: editPatient.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const getInitials = (first: string, last: string) =>
    `${(first ?? "")[0] ?? ""}${(last ?? "")[0] ?? ""}`.toUpperCase();

  const maskSSN = (ssn: string | null) => {
    if (!ssn) return "---";
    return ssn.slice(0, 3) + " *** *** **";
  };

  // Import a single OrdoCAL patient into OrdoFill
  const importOrdocalPatient = async (op: OrdocalPatient) => {
    const exists = patients.some(
      (p) =>
        p.firstName.toLowerCase() === (op.prenom ?? "").toLowerCase() &&
        p.lastName.toLowerCase() === (op.nom ?? "").toLowerCase()
    );
    if (exists) {
      toast({
        title: "Patient deja present",
        description: `${op.prenom} ${op.nom} est deja dans OrdoFill`,
      });
      return;
    }
    await createMutation.mutateAsync({
      firstName: op.prenom ?? "",
      lastName: op.nom ?? "",
      dateOfBirth: op.date_naissance ?? "",
      gender: op.genre ?? "",
      phone: op.telephone ?? "",
      email: "",
      address: op.adresse ?? "",
      city: op.ville ?? "",
      postalCode: op.code_postal ?? "",
      numeroSecuriteSociale: op.numero_securite_sociale ?? "",
      medecinTraitant: op.medecin_traitant ?? "",
      notes: op.notes ?? "",
    });
    toast({
      title: "Patient importe",
      description: `${op.prenom} ${op.nom} a ete ajoute a OrdoFill`,
    });
  };

  const handleSync = async () => {
    if (!user?.ordocalUserId) {
      toast({
        title: "Compte OrdoCAL non lie",
        description: "Allez dans Parametres pour lier votre compte OrdoCAL",
        variant: "destructive",
      });
      return;
    }
    setSyncing(true);
    try {
      // Only refresh the OrdoCAL patient list — do NOT auto-import into OrdoFill
      await queryClient.refetchQueries({ queryKey: ["/api/ordocal/patients"] });
      setViewSource("ordocal");
      toast({
        title: "Sync OrdoCAL terminee",
        description: "Liste des patients OrdoCAL actualisee",
      });
    } catch (err) {
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de recuperer les patients OrdoCAL",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="patients-page">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Patients</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              data-testid="sync-ordocal-btn"
            >
              {syncing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="size-4 mr-2" />
              )}
              {syncing ? "Sync..." : "Sync OrdoCAL"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} size="sm" data-testid="add-patient-btn">
                  <Plus className="size-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="patient-dialog">
                <DialogHeader>
                  <DialogTitle>
                    {editPatient ? "Modifier le patient" : "Nouveau patient"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prenom</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        data-testid="patient-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        data-testid="patient-lastname"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        data-testid="patient-dob"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Genre</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger data-testid="patient-gender">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Feminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>N. Securite Sociale</Label>
                    <Input
                      value={numeroSecuriteSociale}
                      onChange={(e) => setNumeroSecuriteSociale(e.target.value)}
                      placeholder="1 XX XX XX XXX XXX XX"
                      data-testid="patient-ssn"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telephone</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        data-testid="patient-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="patient-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      data-testid="patient-address"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        data-testid="patient-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Code postal</Label>
                      <Input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        data-testid="patient-postal"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Medecin traitant</Label>
                    <Input
                      value={medecinTraitant}
                      onChange={(e) => setMedecinTraitant(e.target.value)}
                      data-testid="patient-medecin"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="patient-submit">
                    {editPatient ? "Enregistrer" : "Ajouter"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Toggle OrdoFill / OrdoCAL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Tabs value={viewSource} onValueChange={(v) => { setViewSource(v as "ordofill" | "ordocal"); setSearch(""); }}>
            <TabsList data-testid="patients-source-tabs">
              <TabsTrigger value="ordofill" className="text-xs" data-testid="patients-tab-ordofill">
                <Users className="size-3 mr-1" />
                OrdoFill ({patients.length})
              </TabsTrigger>
              <TabsTrigger value="ordocal" className="text-xs" data-testid="patients-tab-ordocal" disabled={!ordocalUserId}>
                <CalendarRange className="size-3 mr-1" />
                OrdoCAL ({ordocalPatients.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="patient-search"
            />
          </div>
        </div>
      </div>

      {/* OrdoFill patients view */}
      {viewSource === "ordofill" && (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            {filteredOrdofill.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <Card
                  className="glass rounded-xl card-hover-lift cursor-pointer group border-white/[0.08]"
                  onClick={() => setDetailPatient(p)}
                  data-testid={`patient-card-${p.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="avatar-gradient text-sm font-semibold">
                          {getInitials(p.firstName, p.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {formatName(p.lastName, p.firstName)}
                        </p>
                        <p className="text-xs text-muted-foreground">{maskSSN(p.numeroSecuriteSociale)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        data-testid={`edit-patient-quick-${p.id}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                    {p.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {p.city}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {filteredOrdofill.length === 0 && (
            <div className="text-center py-12 text-muted-foreground" data-testid="patients-empty">
              <User className="size-12 mx-auto mb-3 opacity-50" />
              <p>Aucun patient trouve</p>
            </div>
          )}
        </>
      )}

      {/* OrdoCAL patients view (read-only) */}
      {viewSource === "ordocal" && (
        <>
          {ordocalLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="size-8 mx-auto mb-3 animate-spin" />
              <p>Chargement des patients OrdoCAL...</p>
            </div>
          ) : !ordocalUserId ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="ordocal-not-linked">
              <CalendarRange className="size-12 mx-auto mb-3 opacity-50" />
              <p>Compte OrdoCAL non lie</p>
              <p className="text-xs mt-1">Allez dans Parametres pour lier votre compte OrdoCAL</p>
            </div>
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                {filteredOrdocal.map((p) => (
                  <motion.div key={p.id} variants={staggerItem}>
                    <Card
                      className="glass rounded-xl card-hover-lift cursor-pointer group border-white/[0.08]"
                      onClick={() => setDetailOrdocal(p)}
                      data-testid={`ordocal-card-${p.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="size-10">
                            <AvatarFallback className="avatar-gradient text-sm font-semibold">
                              {getInitials(p.prenom, p.nom)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {formatName(p.nom, p.prenom)}
                            </p>
                            <p className="text-xs text-muted-foreground">{maskSSN(p.numero_securite_sociale)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditOrdocal(p);
                            }}
                            data-testid={`edit-ordocal-quick-${p.id}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            OrdoCAL
                          </Badge>
                        </div>
                        {p.ville && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {p.ville}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {filteredOrdocal.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="size-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun patient OrdoCAL trouve</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* OrdoFill patient detail sheet */}
      <Sheet open={!!detailPatient} onOpenChange={(open) => !open && setDetailPatient(null)}>
        <SheetContent data-testid="patient-detail-sheet">
          {detailPatient && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {formatName(detailPatient.lastName, detailPatient.firstName)}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-center">
                  <Avatar className="size-16">
                    <AvatarFallback className="avatar-gradient text-xl font-bold">
                      {getInitials(detailPatient.firstName, detailPatient.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-3 text-sm">
                  {detailPatient.numeroSecuriteSociale && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <span>N. SS: {detailPatient.numeroSecuriteSociale}</span>
                    </div>
                  )}
                  {detailPatient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <span>{detailPatient.phone}</span>
                    </div>
                  )}
                  {detailPatient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <span>{detailPatient.email}</span>
                    </div>
                  )}
                  {detailPatient.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>
                        {detailPatient.address && `${detailPatient.address}, `}
                        {detailPatient.postalCode && `${detailPatient.postalCode} `}
                        {detailPatient.city}
                      </span>
                    </div>
                  )}
                  {detailPatient.dateOfBirth && (
                    <p>
                      <span className="text-muted-foreground">Ne(e) le: </span>
                      {new Date(detailPatient.dateOfBirth).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {detailPatient.medecinTraitant && (
                    <p>
                      <span className="text-muted-foreground">Medecin traitant: </span>
                      {detailPatient.medecinTraitant}
                    </p>
                  )}
                  {detailPatient.notes && (
                    <p>
                      <span className="text-muted-foreground">Notes: </span>
                      {detailPatient.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDetailPatient(null);
                      openEdit(detailPatient);
                    }}
                    data-testid="edit-patient-btn"
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={async () => {
                      await deleteMutation.mutateAsync(detailPatient.id);
                      setDetailPatient(null);
                    }}
                    data-testid="delete-patient-btn"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* OrdoCAL patient detail sheet (editable) */}
      <Sheet open={!!detailOrdocal} onOpenChange={(open) => {
        if (!open) { setDetailOrdocal(null); setEditingOrdocal(false); }
      }}>
        <SheetContent data-testid="ordocal-detail-sheet" className="overflow-y-auto w-full sm:w-3/4 sm:max-w-sm">
          {detailOrdocal && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {formatName(detailOrdocal.nom, detailOrdocal.prenom)}
                  <Badge variant="secondary" className="ml-2 text-xs">OrdoCAL</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {!editingOrdocal ? (
                  <>
                    <div className="flex justify-center">
                      <Avatar className="size-16">
                        <AvatarFallback className="avatar-gradient text-xl font-bold">
                          {getInitials(detailOrdocal.prenom, detailOrdocal.nom)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-3 text-sm">
                      {detailOrdocal.numero_securite_sociale && (
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" />
                          <span>N. SS: {detailOrdocal.numero_securite_sociale}</span>
                        </div>
                      )}
                      {detailOrdocal.telephone && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" />
                          <span>{detailOrdocal.telephone}</span>
                        </div>
                      )}
                      {detailOrdocal.ville && (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-muted-foreground" />
                          <span>
                            {detailOrdocal.adresse && `${detailOrdocal.adresse}, `}
                            {detailOrdocal.code_postal && `${detailOrdocal.code_postal} `}
                            {detailOrdocal.ville}
                          </span>
                        </div>
                      )}
                      {detailOrdocal.date_naissance && (
                        <p>
                          <span className="text-muted-foreground">Ne(e) le: </span>
                          {new Date(detailOrdocal.date_naissance).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      {detailOrdocal.medecin_traitant && (
                        <p>
                          <span className="text-muted-foreground">Medecin traitant: </span>
                          {detailOrdocal.medecin_traitant}
                        </p>
                      )}
                      {detailOrdocal.notes && (
                        <p>
                          <span className="text-muted-foreground">Notes: </span>
                          {detailOrdocal.notes}
                        </p>
                      )}
                    </div>
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openEditOrdocal(detailOrdocal)}
                        data-testid="edit-ordocal-patient-btn"
                      >
                        <Pencil className="size-4 mr-2" />
                        Modifier
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input value={ocNom} onChange={(e) => setOcNom(e.target.value)} data-testid="oc-nom" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prenom</Label>
                        <Input value={ocPrenom} onChange={(e) => setOcPrenom(e.target.value)} data-testid="oc-prenom" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Date de naissance</Label>
                        <Input type="date" value={ocDateNaissance} onChange={(e) => setOcDateNaissance(e.target.value)} data-testid="oc-dob" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Genre</Label>
                        <Select value={ocGenre} onValueChange={setOcGenre}>
                          <SelectTrigger data-testid="oc-genre"><SelectValue placeholder="---" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Feminin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">N. Securite Sociale</Label>
                      <Input value={ocNumSecu} onChange={(e) => setOcNumSecu(e.target.value)} data-testid="oc-ssn" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telephone</Label>
                      <Input value={ocTelephone} onChange={(e) => setOcTelephone(e.target.value)} data-testid="oc-tel" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Adresse</Label>
                      <Input value={ocAdresse} onChange={(e) => setOcAdresse(e.target.value)} data-testid="oc-adresse" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Ville</Label>
                        <Input value={ocVille} onChange={(e) => setOcVille(e.target.value)} data-testid="oc-ville" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Code postal</Label>
                        <Input value={ocCodePostal} onChange={(e) => setOcCodePostal(e.target.value)} data-testid="oc-cp" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Medecin traitant</Label>
                      <Input value={ocMedecin} onChange={(e) => setOcMedecin(e.target.value)} data-testid="oc-medecin" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleSaveOrdocal} disabled={updateOrdocalMutation.isPending} data-testid="save-ordocal-btn">
                        {updateOrdocalMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingOrdocal(false)} data-testid="cancel-ordocal-btn">
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
