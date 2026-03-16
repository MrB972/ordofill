import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  CheckSquare,
  Type,
  CalendarRange,
  Puzzle,
  Settings2,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import {
  useFormConfig,
  addSection,
  deleteSection,
  updateSection,
  addFieldToSection,
  deleteFieldFromSection,
  updateFieldInSection,
  saveFormConfigToSupabase,
  loadFormConfigFromSupabase,
  generateId,
  setFormConfig,
  getDefaultFormConfig,
  type FormSection,
  type FormField,
  type FormFieldType,
} from "@/lib/form-config-store";
import {
  saveCalibrationToSupabase,
} from "@/lib/calibration-store";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  check: "Case à cocher",
  text: "Texte",
  date: "Date",
  combo: "Combo (X + Texte)",
  combo_date: "Combo (X + Date)",
};

const FIELD_TYPE_ICONS: Record<FormFieldType, typeof CheckSquare> = {
  check: CheckSquare,
  text: Type,
  date: CalendarRange,
  combo: Puzzle,
  combo_date: CalendarRange,
};

const COLOR_OPTIONS = [
  "#6366F1", "#3B82F6", "#06B6D4", "#10B981", "#22C55E",
  "#EAB308", "#F59E0B", "#F97316", "#EF4444", "#F43F5E",
  "#A855F7", "#8B5CF6", "#DC2626", "#6B7280", "#14B8A6",
];

const ICON_OPTIONS = [
  "📋", "🩺", "👤", "📝", "💉", "💊", "🔵", "🟡", "🟠", "🟣",
  "❤️", "🔴", "🟢", "⚪", "🧪", "🔬", "🫗", "🫀", "🩹", "🧫",
  "🩸", "📎", "🏥", "⚠️", "🧬", "💧", "🫁", "🦠", "⭐", "🔷",
];

export default function FormBuilderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const formConfig = useFormConfig();

  const [pageFilter, setPageFilter] = useState<"all" | "1" | "2">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Add section dialog
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSectionPage, setNewSectionPage] = useState<"1" | "2">("1");
  const [newSectionColor, setNewSectionColor] = useState("#6366F1");
  const [newSectionIcon, setNewSectionIcon] = useState("📋");

  // Add field dialog
  const [showAddField, setShowAddField] = useState(false);
  const [addFieldSectionId, setAddFieldSectionId] = useState<string>("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormFieldType>("check");

  // Edit section dialog
  const [editingSection, setEditingSection] = useState<FormSection | null>(null);
  const [editSectionLabel, setEditSectionLabel] = useState("");
  const [editSectionColor, setEditSectionColor] = useState("");
  const [editSectionIcon, setEditSectionIcon] = useState("");

  // Edit field inline
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "section" | "field"; sectionId: string; fieldId?: string; label: string } | null>(null);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    if (user?.id) {
      loadFormConfigFromSupabase(user.id).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const toggleCollapse = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSections = formConfig.sections
    .filter((s) => pageFilter === "all" || s.page === Number(pageFilter))
    .sort((a, b) => a.order - b.order);

  // ---- Save ----
  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const [configOk, calOk] = await Promise.all([
        saveFormConfigToSupabase(user.id),
        saveCalibrationToSupabase(user.id),
      ]);
      if (configOk && calOk) {
        toast({ title: "Configuration sauvegardée", description: "Le formulaire et le calibrage ont été mis à jour." });
      } else {
        toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Add Section ----
  const handleAddSection = () => {
    if (!newSectionLabel.trim()) return;
    const id = generateId();
    const maxOrder = Math.max(...formConfig.sections.map((s) => s.order), -1);
    addSection({
      id,
      label: newSectionLabel.trim(),
      page: Number(newSectionPage) as 1 | 2,
      color: newSectionColor,
      icon: newSectionIcon,
      visible: true,
      order: maxOrder + 1,
      type: "custom",
      fields: [],
    });
    setShowAddSection(false);
    setNewSectionLabel("");
    toast({ title: "Section ajoutée", description: newSectionLabel.trim() });
  };

  // ---- Edit Section ----
  const handleEditSection = () => {
    if (!editingSection || !editSectionLabel.trim()) return;
    updateSection(editingSection.id, {
      label: editSectionLabel.trim(),
      color: editSectionColor,
      icon: editSectionIcon,
    });
    setEditingSection(null);
    toast({ title: "Section modifiée" });
  };

  // ---- Delete ----
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "section") {
      deleteSection(deleteTarget.sectionId);
      toast({ title: "Section supprimée", description: deleteTarget.label });
    } else if (deleteTarget.fieldId) {
      deleteFieldFromSection(deleteTarget.sectionId, deleteTarget.fieldId);
      toast({ title: "Champ supprimé", description: deleteTarget.label });
    }
    setDeleteTarget(null);
  };

  // ---- Add Field ----
  const handleAddField = () => {
    if (!newFieldLabel.trim() || !addFieldSectionId) return;
    const id = generateId();
    const prefix = newFieldType === "check" ? "check_" : newFieldType === "text" || newFieldType === "date" ? "text_" : "combo_";
    const calibrationKey = `${prefix}${id}`;
    const section = formConfig.sections.find((s) => s.id === addFieldSectionId);
    const maxOrder = Math.max(...(section?.fields.map((f) => f.order) ?? []), -1);
    
    addFieldToSection(addFieldSectionId, {
      id,
      calibrationKey,
      label: newFieldLabel.trim(),
      type: newFieldType,
      visible: true,
      order: maxOrder + 1,
    });
    setShowAddField(false);
    setNewFieldLabel("");
    toast({ title: "Champ ajouté", description: `${newFieldLabel.trim()} (${FIELD_TYPE_LABELS[newFieldType]})` });
  };

  // ---- Edit Field ----
  const handleSaveFieldEdit = (sectionId: string, fieldId: string) => {
    if (!editFieldLabel.trim()) return;
    updateFieldInSection(sectionId, fieldId, { label: editFieldLabel.trim() });
    setEditingFieldId(null);
    toast({ title: "Champ renommé" });
  };

  // ---- Reset ----
  const handleReset = () => {
    setFormConfig(getDefaultFormConfig());
    setShowResetConfirm(false);
    toast({ title: "Formulaire réinitialisé", description: "Configuration par défaut restaurée." });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="form-builder-page">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b glass-strong flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link href="/fiche-labo">
          <Button variant="ghost" size="icon" className="size-8" data-testid="back-btn">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-primary" />
          <h1 className="text-base sm:text-lg font-semibold">Configurateur</h1>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
          {formConfig.sections.length} sections
        </Badge>
        <div className="ml-auto flex gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive"
            onClick={() => setShowResetConfirm(true)}
            data-testid="reset-btn"
          >
            <RotateCcw className="size-4 mr-1" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-primary to-accent text-white text-xs"
            data-testid="save-btn"
          >
            {isSaving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Page filter */}
      <div className="p-2 sm:p-3 border-b">
        <div className="flex items-center gap-3">
          <Tabs value={pageFilter} onValueChange={(v) => setPageFilter(v as "all" | "1" | "2")}>
            <TabsList>
              <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
              <TabsTrigger value="1" className="text-xs">Page 1</TabsTrigger>
              <TabsTrigger value="2" className="text-xs">Page 2</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            className="text-xs ml-auto"
            onClick={() => setShowAddSection(true)}
            data-testid="add-section-btn"
          >
            <Plus className="size-4 mr-1" />
            Section
          </Button>
        </div>
      </div>

      {/* Sections list */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-3">
          <AnimatePresence>
            {filteredSections.map((section) => {
              const isCollapsed = collapsedSections.has(section.id);
              const visibleFields = section.fields.filter((f) => f.visible).length;
              const totalFields = section.fields.length;

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  layout
                >
                  <Card className="glass rounded-xl overflow-hidden" style={{ borderColor: section.color + "40" }}>
                    {/* Section header */}
                    <div className="flex items-center gap-2 p-3">
                      <button
                        className="flex items-center gap-2 flex-1 text-left"
                        onClick={() => toggleCollapse(section.id)}
                      >
                        <span className="text-lg">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: section.color }}>
                              {section.label}
                            </span>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              P{section.page}
                            </Badge>
                            {section.type === "custom" && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-purple-500/30 text-purple-400">
                                Perso.
                              </Badge>
                            )}
                          </div>
                          {totalFields > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {visibleFields}/{totalFields} champs
                            </span>
                          )}
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={section.visible}
                          onCheckedChange={(v) => updateSection(section.id, { visible: v })}
                          className="scale-75"
                          data-testid={`toggle-section-${section.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingSection(section);
                            setEditSectionLabel(section.label);
                            setEditSectionColor(section.color);
                            setEditSectionIcon(section.icon);
                          }}
                          data-testid={`edit-section-${section.id}`}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        {section.type !== "static" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            onClick={() => setDeleteTarget({ type: "section", sectionId: section.id, label: section.label })}
                            data-testid={`delete-section-${section.id}`}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Fields list */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-1">
                            {section.fields.length === 0 && section.type === "static" && (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Section native — les champs sont gérés automatiquement
                              </p>
                            )}
                            {section.fields.length === 0 && section.type !== "static" && (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Aucun champ — ajoutez-en un ci-dessous
                              </p>
                            )}
                            {section.fields
                              .sort((a, b) => a.order - b.order)
                              .map((field) => {
                                const FieldIcon = FIELD_TYPE_ICONS[field.type] ?? CheckSquare;
                                const isEditing = editingFieldId === field.id;

                                return (
                                  <motion.div
                                    key={field.id}
                                    layout
                                    className={`flex items-center gap-2 p-1.5 rounded-md text-xs ${
                                      field.visible ? "bg-muted/30" : "bg-muted/10 opacity-50"
                                    }`}
                                  >
                                    <GripVertical className="size-3 text-muted-foreground shrink-0 cursor-grab" />
                                    <FieldIcon className="size-3 shrink-0" style={{ color: section.color }} />
                                    
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 flex-1">
                                        <Input
                                          value={editFieldLabel}
                                          onChange={(e) => setEditFieldLabel(e.target.value)}
                                          className="h-6 text-xs flex-1"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveFieldEdit(section.id, field.id);
                                            if (e.key === "Escape") setEditingFieldId(null);
                                          }}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-5"
                                          onClick={() => handleSaveFieldEdit(section.id, field.id)}
                                        >
                                          <Check className="size-3 text-green-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-5"
                                          onClick={() => setEditingFieldId(null)}
                                        >
                                          <X className="size-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="flex-1 truncate">{field.label}</span>
                                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0">
                                          {FIELD_TYPE_LABELS[field.type]?.split(" ")[0]}
                                        </Badge>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-5"
                                            onClick={() => updateFieldInSection(section.id, field.id, { visible: !field.visible })}
                                          >
                                            {field.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-5"
                                            onClick={() => {
                                              setEditingFieldId(field.id);
                                              setEditFieldLabel(field.label);
                                            }}
                                          >
                                            <Pencil className="size-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-5 text-destructive"
                                            onClick={() => setDeleteTarget({ type: "field", sectionId: section.id, fieldId: field.id, label: field.label })}
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </motion.div>
                                );
                              })}

                            {/* Add field button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground hover:text-primary mt-1"
                              onClick={() => {
                                setAddFieldSectionId(section.id);
                                setNewFieldLabel("");
                                setNewFieldType("check");
                                setShowAddField(true);
                              }}
                              data-testid={`add-field-${section.id}`}
                            >
                              <Plus className="size-3 mr-1" />
                              Ajouter un champ
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredSections.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Aucune section pour cette page
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ---- Dialogs ---- */}

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Nouvelle section
            </DialogTitle>
            <DialogDescription>
              Créez une nouvelle section pour votre formulaire
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nom de la section</Label>
              <Input
                value={newSectionLabel}
                onChange={(e) => setNewSectionLabel(e.target.value)}
                placeholder="Ex: Analyses spéciales"
                className="h-8 text-sm"
                autoFocus
                data-testid="new-section-label"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Page</Label>
              <Select value={newSectionPage} onValueChange={(v) => setNewSectionPage(v as "1" | "2")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Page 1</SelectItem>
                  <SelectItem value="2">Page 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icône</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all ${
                      newSectionIcon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setNewSectionIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Couleur</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full transition-all ${
                      newSectionColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewSectionColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowAddSection(false)}>Annuler</Button>
            <Button size="sm" onClick={handleAddSection} disabled={!newSectionLabel.trim()} data-testid="confirm-add-section">
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => { if (!open) setEditingSection(null); }}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4" />
              Modifier la section
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input
                value={editSectionLabel}
                onChange={(e) => setEditSectionLabel(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icône</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all ${
                      editSectionIcon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setEditSectionIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Couleur</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full transition-all ${
                      editSectionColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditSectionColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>Annuler</Button>
            <Button size="sm" onClick={handleEditSection} disabled={!editSectionLabel.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={showAddField} onOpenChange={setShowAddField}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Nouveau champ
            </DialogTitle>
            <DialogDescription>
              Ajoutez un champ à la section{" "}
              <span className="font-medium">
                {formConfig.sections.find((s) => s.id === addFieldSectionId)?.label}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nom du champ</Label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Ex: Dosage vitamine K"
                className="h-8 text-sm"
                autoFocus
                data-testid="new-field-label"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FormFieldType)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Case à cocher</SelectItem>
                  <SelectItem value="text">Texte libre</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="combo">Combo (X + Texte)</SelectItem>
                  <SelectItem value="combo_date">Combo (X + Date)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowAddField(false)}>Annuler</Button>
            <Button size="sm" onClick={handleAddField} disabled={!newFieldLabel.trim()} data-testid="confirm-add-field">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "section"
                ? `Supprimer la section « ${deleteTarget.label} » et tous ses champs ? Cette action est irréversible.`
                : `Supprimer le champ « ${deleteTarget?.label} » ? Le champ sera aussi supprimé du calibrage.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground" data-testid="confirm-delete">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les modifications seront perdues et le formulaire Cerballiance par défaut sera restauré.
              N'oubliez pas de sauvegarder après la réinitialisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
