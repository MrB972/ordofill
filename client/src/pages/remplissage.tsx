import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { FormTemplate, Patient, DetectedField, SmartSuggestion } from "@shared/schema";

export default function RemplissagePage() {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  const { data: templates = [] } = useQuery<FormTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const detectedFields = useMemo<DetectedField[]>(() => {
    if (!selectedTemplate?.detectedFields) return [];
    return selectedTemplate.detectedFields as DetectedField[];
  }, [selectedTemplate]);

  const { data: suggestions = [] } = useQuery<SmartSuggestion[]>({
    queryKey: ["/api/suggestions", selectedTemplateId],
    enabled: !!selectedTemplateId,
  });

  const setFieldValue = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const applySuggestion = (fieldName: string, value: string) => {
    setFieldValue(fieldName, value);
    toast({ title: "Suggestion appliquee", description: `${fieldName}: ${value}` });
  };

  const getSuggestionsForField = (fieldName: string) =>
    suggestions.filter((s) => s.fieldName === fieldName);

  const handleGenerate = () => {
    toast({
      title: "PDF genere",
      description: "Le formulaire a ete genere avec succes.",
    });
  };

  return (
    <div className="h-full flex flex-col" data-testid="remplissage-page">
      <div className="p-4 border-b glass-strong flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 min-w-[200px]">
          <Label className="text-sm whitespace-nowrap">Template:</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger data-testid="template-selector" className="w-[220px]">
              <SelectValue placeholder="Choisir un template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <Label className="text-sm whitespace-nowrap">Patient:</Label>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger data-testid="patient-selector" className="w-[220px]">
              <SelectValue placeholder="Choisir un patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          className="ml-auto bg-gradient-to-r from-primary to-accent text-white pulse-glow"
          disabled={!selectedTemplateId}
          data-testid="generate-pdf-btn"
        >
          <Download className="size-4 mr-2" />
          Valider & Generer PDF
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" data-testid="split-view">
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full bg-muted/20 flex items-center justify-center relative p-4">
              {selectedTemplate ? (
                <div
                  className="w-full max-w-[600px] aspect-[210/297] bg-white dark:bg-slate-900 rounded-lg shadow-lg relative border"
                  data-testid="document-viewer"
                >
                  <div className="absolute inset-0 p-8">
                    <div className="text-center mb-6">
                      <p className="text-lg font-bold text-foreground/80">
                        {selectedTemplate.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTemplate.category}
                      </p>
                    </div>
                    {detectedFields.map((field) => (
                      <div
                        key={field.name}
                        className={`absolute border-2 rounded cursor-pointer transition-colors ${
                          activeField === field.name
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/30 hover:border-primary/50"
                        }`}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}%`,
                          height: `${field.height}%`,
                        }}
                        onClick={() => setActiveField(field.name)}
                        data-testid={`field-overlay-${field.name}`}
                      >
                        <span className="absolute -top-5 left-0 text-[10px] text-muted-foreground bg-background px-1 rounded">
                          {field.label}
                        </span>
                        {fieldValues[field.name] && (
                          <span className="text-xs p-1 text-foreground">
                            {fieldValues[field.name]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="size-16 mx-auto mb-4 opacity-30" />
                  <p>Selectionnez un template pour commencer</p>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={25}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4" data-testid="form-panel">
                {!selectedTemplate && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selectionnez un template a gauche
                  </p>
                )}

                {detectedFields.map((field) => {
                  const fieldSuggestions = getSuggestionsForField(field.name);
                  return (
                    <motion.div
                      key={field.name}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`space-y-2 p-3 rounded-lg transition-colors ${
                        activeField === field.name
                          ? "bg-primary/5 border border-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setActiveField(field.name)}
                      data-testid={`form-field-${field.name}`}
                    >
                      <Label className="text-sm">{field.label}</Label>
                      {field.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={fieldValues[field.name] === "true"}
                          onChange={(e) =>
                            setFieldValue(field.name, String(e.target.checked))
                          }
                          className="size-4"
                          data-testid={`input-${field.name}`}
                        />
                      ) : field.type === "date" ? (
                        <Input
                          type="date"
                          value={fieldValues[field.name] ?? ""}
                          onChange={(e) => setFieldValue(field.name, e.target.value)}
                          data-testid={`input-${field.name}`}
                        />
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={fieldValues[field.name] ?? ""}
                          onChange={(e) => setFieldValue(field.name, e.target.value)}
                          placeholder={field.label}
                          data-testid={`input-${field.name}`}
                        />
                      )}
                      {fieldSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fieldSuggestions.map((s) => (
                            <Badge
                              key={s.id}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20 transition-colors text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                applySuggestion(field.name, s.suggestedValue);
                              }}
                              data-testid={`suggestion-${s.id}`}
                            >
                              <Sparkles className="size-3 mr-1" />
                              {s.suggestedValue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
