import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import type { FormTemplate } from "@shared/schema";

const categories = ["Tous", "CPAM", "Mutuelle", "Prescription", "Autre"];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function FormulairesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "detecting" | "done">("idle");

  const { data: templates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; category: string }) => {
      const res = await apiRequest("POST", "/api/templates", {
        ...data,
        detectedFields: [],
        description: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  const filtered = templates.filter((t) => {
    const matchCategory = category === "Tous" || t.category === category;
    const matchSearch =
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const simulateUpload = async () => {
    setUploadStep("uploading");
    await new Promise((r) => setTimeout(r, 1200));
    setUploadStep("detecting");
    await new Promise((r) => setTimeout(r, 1500));
    await createMutation.mutateAsync({
      name: "Nouveau formulaire",
      category: "Autre",
    });
    setUploadStep("done");
    setTimeout(() => {
      setUploadOpen(false);
      setUploadStep("idle");
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6" data-testid="formulaires-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Formulaires</h1>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="upload-template-btn">
              <Upload className="size-4 mr-2" />
              Uploader un formulaire
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="upload-dialog">
            <DialogHeader>
              <DialogTitle>Uploader un formulaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {uploadStep === "idle" && (
                <div
                  className="border-2 border-dashed border-muted rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={simulateUpload}
                  data-testid="upload-dropzone"
                >
                  <Upload className="size-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Glissez un PDF ici ou cliquez pour uploader
                  </p>
                </div>
              )}
              {uploadStep === "uploading" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm">Upload en cours...</p>
                </div>
              )}
              {uploadStep === "detecting" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-8 animate-spin text-accent" />
                  <p className="text-sm">Detection IA des champs...</p>
                </div>
              )}
              {uploadStep === "done" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="size-8 text-green-500" />
                  <p className="text-sm">Formulaire ajoute avec succes !</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un formulaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="template-search"
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList data-testid="category-tabs">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} data-testid={`cat-${c}`}>
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {filtered.map((t) => (
          <motion.div key={t.id} variants={staggerItem}>
            <Card
              className="glass rounded-xl card-hover-lift cursor-pointer group border-white/[0.08]"
              data-testid={`template-card-${t.id}`}
            >
              <CardContent className="p-4">
                <div className="template-thumb w-full h-32 rounded-lg bg-muted/50 mb-3 flex items-center justify-center group-hover:bg-muted/70 transition-colors">
                  <FileText className="size-10 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-sm truncate">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className={`text-xs ${t.category === "CPAM" ? "badge-cpam" : t.category === "Mutuelle" ? "badge-mutuelle" : t.category === "Prescription" ? "badge-prescription" : "badge-autre"}`}>
                    {t.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t.uploadCount ?? 0} utilisations
                  </span>
                </div>
                {t.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
          <FileText className="size-12 mx-auto mb-3 opacity-50" />
          <p>Aucun formulaire trouve</p>
        </div>
      )}
    </div>
  );
}
