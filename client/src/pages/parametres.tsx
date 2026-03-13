import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Pen,
  Settings,
  Shield,
  Upload,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ParametresPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [cabinetName, setCabinetName] = useState(user?.cabinetName ?? "");
  const [cabinetAddress, setCabinetAddress] = useState(user?.cabinetAddress ?? "");
  const [numeroRpps, setNumeroRpps] = useState(user?.numeroRpps ?? "");
  const [numeroAdeli, setNumeroAdeli] = useState(user?.numeroAdeli ?? "");

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      if (!user) throw new Error("Not authenticated");
      const res = await apiRequest("PATCH", `/api/profiles/${user.id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "Profil mis a jour" });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      fullName,
      email,
      phone,
      cabinetName,
      cabinetAddress,
      numeroRpps,
      numeroAdeli,
    });
  };

  return (
    <div className="p-6 max-w-3xl" data-testid="parametres-page">
      <h1 className="text-xl font-semibold mb-6">Parametres</h1>

      <Tabs defaultValue="profil" data-testid="settings-tabs">
        <TabsList className="mb-6">
          <TabsTrigger value="profil" data-testid="tab-profil">
            <User className="size-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="signature" data-testid="tab-signature">
            <Pen className="size-4 mr-2" />
            Signature
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Settings className="size-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="compte" data-testid="tab-compte">
            <Shield className="size-4 mr-2" />
            Compte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card className="glass rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      data-testid="settings-fullname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="settings-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telephone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="settings-phone"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numero RPPS</Label>
                    <Input
                      value={numeroRpps}
                      onChange={(e) => setNumeroRpps(e.target.value)}
                      data-testid="settings-rpps"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Numero ADELI</Label>
                    <Input
                      value={numeroAdeli}
                      onChange={(e) => setNumeroAdeli(e.target.value)}
                      data-testid="settings-adeli"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du cabinet</Label>
                    <Input
                      value={cabinetName}
                      onChange={(e) => setCabinetName(e.target.value)}
                      data-testid="settings-cabinet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse du cabinet</Label>
                    <Input
                      value={cabinetAddress}
                      onChange={(e) => setCabinetAddress(e.target.value)}
                      data-testid="settings-address"
                    />
                  </div>
                </div>
                <Button type="submit" data-testid="settings-save">
                  Enregistrer
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature">
          <Card className="glass rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Signature electronique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.signatureUrl ? (
                <div className="border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Signature enregistree</p>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-muted rounded-xl p-8 text-center"
                  data-testid="signature-area"
                >
                  <Pen className="size-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucune signature enregistree
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-4 text-sm"
                    data-testid="signature-upload"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="glass rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Suggestions intelligentes</p>
                  <p className="text-xs text-muted-foreground">
                    Activer les suggestions de remplissage automatique
                  </p>
                </div>
                <Switch defaultChecked data-testid="pref-suggestions" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sauvegarde automatique</p>
                  <p className="text-xs text-muted-foreground">
                    Sauvegarder les brouillons automatiquement
                  </p>
                </div>
                <Switch defaultChecked data-testid="pref-autosave" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compte">
          <Card className="glass rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" data-testid="export-data">
                  <Download className="size-4 mr-2" />
                  Exporter mes donnees
                </Button>
                <Button variant="outline" data-testid="import-data">
                  <Upload className="size-4 mr-2" />
                  Importer des donnees
                </Button>
              </div>
              <div className="pt-4 border-t">
                <Button variant="destructive" data-testid="delete-account">
                  Supprimer mon compte
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
