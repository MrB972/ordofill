import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Copy,
  Download,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { FilledForm, FormTemplate, Patient } from "@shared/schema";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  completed: "Termine",
  downloaded: "Telecharge",
};

const statusVariant: Record<string, "outline" | "default" | "secondary"> = {
  draft: "outline",
  completed: "default",
  downloaded: "secondary",
};

export default function HistoriquePage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: filledForms = [] } = useQuery<FilledForm[]>({
    queryKey: ["/api/filled-forms"],
  });

  const { data: templates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  const filtered = filledForms
    .filter((f) => statusFilter === "all" || f.status === statusFilter)
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

  const handleDuplicate = (f: FilledForm) => {
    toast({ title: "Formulaire duplique", description: "Redirection vers le remplissage..." });
  };

  const handleDownload = (f: FilledForm) => {
    toast({ title: "Telechargement", description: "PDF en cours de telechargement..." });
  };

  return (
    <div className="p-6 space-y-6" data-testid="historique-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Historique</h1>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="status-filter">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="completed">Termine</SelectItem>
              <SelectItem value="downloaded">Telecharge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((f, i) => {
          const template = templateMap.get(f.templateId);
          const patient = patientMap.get(f.patientId);
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="glass rounded-xl"
                data-testid={`history-item-${f.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {template?.name ?? "Formulaire inconnu"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient
                          ? `${patient.firstName} ${patient.lastName}`
                          : "Patient inconnu"}
                        {" - "}
                        {f.createdAt
                          ? new Date(f.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[f.status]} data-testid={`history-status-${f.id}`}>
                      {statusLabels[f.status] ?? f.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleDuplicate(f)}
                      data-testid={`duplicate-${f.id}`}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleDownload(f)}
                      data-testid={`download-${f.id}`}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="history-empty">
          <FileText className="size-12 mx-auto mb-3 opacity-50" />
          <p>Aucun formulaire dans l'historique</p>
        </div>
      )}
    </div>
  );
}
