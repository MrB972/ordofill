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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";

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
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);

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

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.numeroSecuriteSociale?.includes(q)
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

  const getInitials = (p: Patient) =>
    `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();

  const maskSSN = (ssn: string | null) => {
    if (!ssn) return "---";
    return ssn.slice(0, 3) + " *** *** **";
  };

  return (
    <div className="p-6 space-y-6" data-testid="patients-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Patients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} data-testid="add-patient-btn">
              <Plus className="size-4 mr-2" />
              Ajouter un patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="patient-dialog">
            <DialogHeader>
              <DialogTitle>
                {editPatient ? "Modifier le patient" : "Nouveau patient"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un patient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="patient-search"
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {filtered.map((p) => (
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
                      {getInitials(p)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{maskSSN(p.numeroSecuriteSociale)}</p>
                  </div>
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

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="patients-empty">
          <User className="size-12 mx-auto mb-3 opacity-50" />
          <p>Aucun patient trouve</p>
        </div>
      )}

      <Sheet open={!!detailPatient} onOpenChange={(open) => !open && setDetailPatient(null)}>
        <SheetContent data-testid="patient-detail-sheet">
          {detailPatient && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {detailPatient.firstName} {detailPatient.lastName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-center">
                  <Avatar className="size-16">
                    <AvatarFallback className="avatar-gradient text-xl font-bold">
                      {getInitials(detailPatient)}
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
    </div>
  );
}
