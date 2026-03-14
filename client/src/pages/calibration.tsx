import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Download,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Trash2,
  Pencil,
  Save,
  Loader2,
  Type,
  Space,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  useCalibration,
  getCalibration,
  updateFieldCoord,
  updateFieldProp,
  renameField,
  addField,
  deleteField,
  resetCalibration,
  exportCalibrationJSON,
  importCalibrationJSON,
  saveCalibrationToSupabase,
  loadCalibrationFromSupabase,
  CALIBRATION_SECTIONS,
  type CalibrationMap,
  type FieldCoord,
  type ComboOrder,
} from "@/lib/calibration-store";
import { generateCerballiancePDF } from "@/lib/pdf-cerballiance";
import {
  usePreviewData,
  getPreviewValueForField,
  type PreviewFormData,
} from "@/lib/preview-data-store";

// PDF page dimensions (points)
const PDF_W = 595.276;
const PDF_H = 841.89;

export default function CalibrationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const calibration = useCalibration();

  // Zoom
  const [zoom, setZoom] = useState(1);
  // Selected field for editing
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Show/hide markers overlay
  const [showMarkers, setShowMarkers] = useState(true);
  // Section filter
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // Collapsed sections in side panel
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  // Dragging state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Container ref for coordinate calculations
  const containerRef = useRef<HTMLDivElement>(null);
  // Mobile panel
  const [showSidePanel, setShowSidePanel] = useState(true);
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  // Preview mode: show real data instead of labels
  const [previewMode, setPreviewMode] = useState(false);
  const previewData = usePreviewData();
  // Editing field label inline
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  // Add field dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "check" | "combo">("text");
  const [newFieldComboOrder, setNewFieldComboOrder] = useState<ComboOrder>("check_text");
  const [newFieldSection, setNewFieldSection] = useState("header");
  // Expanded detail row
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // Ref for side panel scroll viewport (for auto-scroll on marker click)
  const sidePanelRef = useRef<HTMLDivElement>(null);

  // Pre-rendered image of the blank form (converted at build time from PDF → JPG at 300 DPI)
  const pdfImageUrl = "/fiche-labo-vierge.jpg";

  // Auto-load calibration from Supabase on mount
  useEffect(() => {
    if (user?.id) {
      loadCalibrationFromSupabase(user.id).then((loaded) => {
        if (loaded) {
          toast({ title: "Calibration chargée", description: "Vos réglages par défaut ont été restaurés" });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  // Filter fields by active section
  const visibleFields = useMemo(() => {
    const entries = Object.entries(calibration);
    if (!activeSection) return entries;
    return entries.filter(([_, field]) => field.section === activeSection);
  }, [calibration, activeSection]);

  // Handle mouse/touch start on a marker
  const handlePointerDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(key);
      setSelectedKey(key);
      // Auto-open the detail panel for the clicked field
      setExpandedKey(key);
      // Ensure the section is uncollapsed so the row is in DOM
      const fieldForSection = calibration[key];
      if (fieldForSection) {
        setCollapsedSections((prev) => {
          if (prev.has(fieldForSection.section)) {
            const next = new Set(prev);
            next.delete(fieldForSection.section);
            return next;
          }
          return prev;
        });
      }
      // Auto-scroll to the row in the side panel after React renders
      // Use setTimeout to wait for React to uncollapse the section and render
      setTimeout(() => {
        const row = document.querySelector(`[data-testid="coord-row-${key}"]`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 80);
      const field = calibration[key];
      if (!field || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const displayW = PDF_W * zoom;
      const displayH = PDF_H * zoom;
      const offsetX = (rect.width - displayW) / 2;
      const offsetY = 0;
      const markerScreenX = offsetX + (field.x / PDF_W) * displayW;
      const markerScreenY = offsetY + (field.y / PDF_H) * displayH;
      setDragOffset({
        x: e.clientX - rect.left - markerScreenX,
        y: e.clientY - rect.top + containerRef.current.scrollTop - markerScreenY,
      });
    },
    [calibration, zoom]
  );

  // Handle mouse/touch move while dragging
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const displayW = PDF_W * zoom;
      const displayH = PDF_H * zoom;
      const offsetX = (rect.width - displayW) / 2;
      const offsetY = 0;
      const localX = e.clientX - rect.left - offsetX - dragOffset.x;
      const localY = e.clientY - rect.top + containerRef.current.scrollTop - offsetY - dragOffset.y;
      const pdfX = Math.round((localX / displayW) * PDF_W * 10) / 10;
      const pdfY = Math.round((localY / displayH) * PDF_H * 10) / 10;
      const clampedX = Math.max(0, Math.min(PDF_W, pdfX));
      const clampedY = Math.max(0, Math.min(PDF_H, pdfY));
      updateFieldCoord(dragging, clampedX, clampedY);
    },
    [dragging, zoom, dragOffset]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Handle numeric input changes
  const handleCoordChange = (key: string, axis: "x" | "y", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const field = calibration[key];
    if (!field) return;
    updateFieldCoord(key, axis === "x" ? num : field.x, axis === "y" ? num : field.y);
  };

  // ---- Inline rename ----
  const startRename = (key: string, currentLabel: string) => {
    setEditingLabelKey(key);
    setEditingLabelValue(currentLabel);
  };
  const confirmRename = () => {
    if (editingLabelKey && editingLabelValue.trim()) {
      renameField(editingLabelKey, editingLabelValue.trim());
    }
    setEditingLabelKey(null);
    setEditingLabelValue("");
  };

  // ---- Add field ----
  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    // Generate a unique key
    const prefix = newFieldType === "check" ? "check_" : newFieldType === "combo" ? "combo_" : "text_";
    const slug = newFieldLabel.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/g, "");
    let key = `${prefix}${slug}`;
    // Ensure uniqueness
    let counter = 1;
    while (calibration[key]) {
      key = `${prefix}${slug}_${counter}`;
      counter++;
    }
    const newField: FieldCoord = {
      x: 100,
      y: 100,
      label: newFieldLabel.trim(),
      type: newFieldType,
      section: newFieldSection,
      fontSize: 8,
      wordSpacing: 0,
      ...(newFieldType === "combo" ? { comboOrder: newFieldComboOrder } : {}),
    };
    addField(key, newField);
    setShowAddDialog(false);
    setNewFieldLabel("");
    setNewFieldComboOrder("check_text");
    setSelectedKey(key);
    toast({ title: "Champ ajouté", description: `"${newFieldLabel.trim()}" ajouté dans la section` });
  };

  // ---- Delete field ----
  const handleDeleteField = (key: string, label: string) => {
    deleteField(key);
    if (selectedKey === key) setSelectedKey(null);
    if (expandedKey === key) setExpandedKey(null);
    toast({ title: "Champ supprimé", description: `"${label}" a été retiré` });
  };

  // Export
  const handleExport = () => {
    const json = exportCalibrationJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ordofill-calibration.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Calibration exportée", description: "Fichier JSON téléchargé" });
  };

  // Import
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const success = importCalibrationJSON(text);
      if (success) {
        toast({ title: "Calibration importée", description: "Coordonnées mises à jour" });
      } else {
        toast({ title: "Erreur", description: "Fichier JSON invalide", variant: "destructive" });
      }
    };
    input.click();
  };

  // Reset
  const handleReset = () => {
    resetCalibration();
    toast({ title: "Réinitialisation", description: "Coordonnées remises aux valeurs par défaut" });
  };

  // Save to Supabase
  const handleSaveDefault = async () => {
    if (!user?.id) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const success = await saveCalibrationToSupabase(user.id);
      if (success) {
        toast({ title: "Sauvegardé", description: "Calibration enregistrée par défaut" });
      } else {
        toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Test PDF
  const handleTestPDF = async () => {
    try {
      await generateCerballiancePDF({
        ideName: "IDE TEST",
        idePhone: "0696123456",
        ideCabinet: "Cabinet Test",
        ideRpps: "12345678",
        ideAdeli: "87654321",
        nomUsuel: "DUPONT",
        prenoms: "Jean-Pierre",
        dateNaissance: "1985-03-15",
        sexe: "M",
        adresse: "12 rue des Palmiers, 97200 Fort-de-France",
        telephone: "0696999888",
        numSecu: "1 85 03 972 123 456 78",
        medecinTraitant: "Dr. Martin",
        datePrelevement: "2026-03-14",
        heurePrelevement: "07:30",
        grossesse: false,
        fievre: true,
        traitements: "Doliprane 1g, Kardegic 75mg",
        urgent: true,
        anticoagulant: "Previscan",
        posologie: "1cp/j",
        inrCible: "2-3",
        analysesBySection: [
          { label: "Tube bleu", color: "#3B82F6", analyses: ["INR", "TCA", "TP", "Ddimeres"] },
          { label: "Tube jaune", color: "#EAB308", analyses: ["Creatinine", "CRP / CRP us", "Ionogramme complet", "TSH", "Ferritine", "Bilan hepatique", "GGT", "ALAT / ASAT", "Vit D", "HbA1C"] },
          { label: "Cardiaques", color: "#EF4444", analyses: ["NTproBNP", "Troponine"] },
          { label: "Tube violet", color: "#8B5CF6", analyses: ["NFS", "VS", "Plaquettes", "HbA1C"] },
          { label: "Tube gris", color: "#6B7280", analyses: ["Glycemie a Jeun"] },
        ],
      });
      toast({ title: "PDF test généré", description: "Vérifiez l'alignement des données" });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de générer le PDF test", variant: "destructive" });
    }
  };

  const togglePanelSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get marker color by section
  const getSectionColor = (sectionId: string) => {
    return CALIBRATION_SECTIONS.find((s) => s.id === sectionId)?.color ?? "#888";
  };

  // Toggle expanded detail for a field row
  const toggleExpanded = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="h-full flex flex-col" data-testid="calibration-page">
      {/* Header */}
      <div className="p-3 border-b glass-strong flex items-center gap-2 flex-wrap">
        <Link href="/fiche-labo">
          <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="back-to-fiche">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Crosshair className="size-5 text-primary" />
          <h1 className="text-base font-semibold">Calibration PDF</h1>
        </div>

        <div className="ml-auto flex gap-1.5 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveDefault}
            disabled={isSaving}
            className="text-xs gap-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:opacity-90"
            data-testid="save-default"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span className="hidden sm:inline">Enregistrer par défaut</span>
          </Button>
          <Button
            variant={previewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className={`text-xs gap-1 ${previewMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            data-testid="toggle-preview"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">{previewMode ? "Aperçu données" : "Aperçu données"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowMarkers(!showMarkers)} className="text-xs gap-1" data-testid="toggle-markers">
            {showMarkers ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            <span className="hidden sm:inline">{showMarkers ? "Masquer" : "Afficher"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={zoomOut} className="text-xs" data-testid="zoom-out">
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs flex items-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={zoomIn} className="text-xs" data-testid="zoom-in">
            <ZoomIn className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleTestPDF} className="text-xs gap-1" data-testid="test-pdf">
            <Check className="size-3.5" />
            <span className="hidden sm:inline">Tester PDF</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImport} className="text-xs gap-1" data-testid="import-cal">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} className="text-xs gap-1" data-testid="export-cal">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1 text-destructive" data-testid="reset-cal">
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Réinit.</span>
          </Button>
        </div>
      </div>

      {/* Toggle side panel on mobile */}
      <div className="sm:hidden p-2 border-b flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowSidePanel(false)}>
          Aperçu PDF
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowSidePanel(true)}>
          Coordonnées
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex-1 min-h-0 flex">
        {/* PDF preview area */}
        <div
          className={`${showSidePanel ? "hidden sm:block" : "block"} flex-1 overflow-auto bg-muted/30 relative`}
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: dragging ? "none" : "auto" }}
        >
          <div
            className="relative mx-auto my-4"
            style={{
              width: PDF_W * zoom,
              height: PDF_H * zoom,
            }}
          >
            {/* PDF background — pre-rendered 300 DPI image */}
            <img
              src={pdfImageUrl}
              alt="Formulaire vierge Cerballiance"
              className="absolute inset-0 w-full h-full"
              style={{ imageRendering: "auto" }}
              draggable={false}
            />

            {/* Preview mode: render actual text data on the PDF */}
            {previewMode &&
              Object.entries(calibration).map(([key, field]) => {
                // For check fields: always show "X" in preview so positions can be calibrated
                // For text fields: use real form data or fall back to label
                // For combo fields: show "X" + text (or text + "X") with spacing
                let preview: { text: string; isCheck: boolean };
                if (field.type === "check") {
                  preview = { text: "X", isCheck: true };
                } else if (field.type === "combo") {
                  // Build combo preview string: X + label or custom value
                  const comboVal = getPreviewValueForField(key, previewData);
                  const textPart = comboVal?.text || field.label;
                  const order = field.comboOrder ?? "check_text";
                  preview = {
                    text: order === "check_text" ? `X ${textPart}` : `${textPart} X`,
                    isCheck: false,
                  };
                } else {
                  preview = getPreviewValueForField(key, previewData) ?? { text: field.label, isCheck: false };
                }
                if (!preview.text) return null;

                const screenX = (field.x / PDF_W) * 100;
                const screenY = (field.y / PDF_H) * 100;
                // Scale font size from PDF points to screen pixels
                const pxPerPt = zoom;
                const fontSize = field.fontSize * pxPerPt;
                // Word spacing in screen px
                const wordSpacing = field.wordSpacing * pxPerPt;
                const isSelected = selectedKey === key;
                const isDragged = dragging === key;
                const color = getSectionColor(field.section);

                return (
                  <div
                    key={`preview-${key}`}
                    className="absolute cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${screenX}%`,
                      top: `${screenY}%`,
                      transform: preview.isCheck ? "translate(-25%, -60%)" : "translate(0, -80%)",
                      zIndex: isSelected || isDragged ? 100 : 20,
                    }}
                    onPointerDown={(e) => handlePointerDown(key, e)}
                    data-testid={`preview-${key}`}
                  >
                    {/* Render text with word-spacing applied on separators */}
                    <span
                      className="whitespace-nowrap flex items-baseline pointer-events-none select-none"
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontWeight: preview.isCheck ? 700 : 400,
                        color: "#000",
                        lineHeight: 1,
                        textShadow: isSelected ? `0 0 4px ${color}80` : "none",
                      }}
                    >
                      {wordSpacing > 0 && !preview.isCheck
                        ? preview.text.split(/(\s+|\/|-|\.|:)/).filter(Boolean).map((token, i) => (
                            <span key={i} style={{ marginRight: i < preview.text.split(/(\s+|\/|-|\.|:)/).filter(Boolean).length - 1 ? `${wordSpacing}px` : 0 }}>
                              {token}
                            </span>
                          ))
                        : preview.text
                      }
                    </span>
                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
                        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                      />
                    )}
                  </div>
                );
              })}

            {/* Markers overlay (colored dots + labels) — hidden in preview mode */}
            {showMarkers && !previewMode &&
              visibleFields.map(([key, field]) => {
                const screenX = (field.x / PDF_W) * 100;
                const screenY = (field.y / PDF_H) * 100;
                const isSelected = selectedKey === key;
                const isDragged = dragging === key;
                const color = getSectionColor(field.section);
                const markerSize = field.type === "check" || field.type === "combo" ? 8 : 6;

                return (
                  <div
                    key={key}
                    className="absolute cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${screenX}%`,
                      top: `${screenY}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: isSelected || isDragged ? 100 : 10,
                    }}
                    onPointerDown={(e) => handlePointerDown(key, e)}
                    data-testid={`marker-${key}`}
                  >
                    {/* Marker dot */}
                    <div
                      className="rounded-full border-2 transition-all"
                      style={{
                        width: markerSize * (zoom > 1.5 ? 1 : zoom > 1 ? 1.2 : 1.5),
                        height: markerSize * (zoom > 1.5 ? 1 : zoom > 1 ? 1.2 : 1.5),
                        backgroundColor: color + (isSelected ? "FF" : "AA"),
                        borderColor: isSelected ? "#fff" : color,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${color}, 0 0 8px ${color}80`
                          : isDragged
                            ? `0 0 6px ${color}80`
                            : "none",
                      }}
                    />
                    {/* Label tooltip (draggable like the dot) */}
                    {(isSelected || zoom >= 1.5) && (
                      <div
                        className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] px-1 py-0.5 rounded font-medium cursor-grab active:cursor-grabbing"
                        style={{
                          backgroundColor: color + "DD",
                          color: "#fff",
                          fontSize: Math.max(8, 10 / zoom),
                        }}
                      >
                        {field.label}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Side panel: coordinates + controls */}
        <div className={`${showSidePanel ? "block" : "hidden sm:block"} w-full sm:w-[340px] sm:min-w-[300px] border-l bg-background`}>
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {/* Section filter chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${!activeSection ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setActiveSection(null)}
                >
                  Tout
                </button>
                {CALIBRATION_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${activeSection === sec.id ? "text-white" : "hover:bg-muted"}`}
                    style={{
                      backgroundColor: activeSection === sec.id ? sec.color : "transparent",
                      borderColor: sec.color + "60",
                    }}
                    onClick={() => setActiveSection(activeSection === sec.id ? null : sec.id)}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Add field button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 border-dashed"
                onClick={() => setShowAddDialog(true)}
                data-testid="add-field-btn"
              >
                <Plus className="size-3.5" />
                Ajouter un champ
              </Button>

              {/* Grouped fields */}
              {CALIBRATION_SECTIONS.filter(
                (sec) => !activeSection || activeSection === sec.id
              ).map((sec) => {
                const sectionFields = Object.entries(calibration).filter(
                  ([_, f]) => f.section === sec.id
                );
                if (sectionFields.length === 0) return null;
                const isCollapsed = collapsedSections.has(sec.id);

                return (
                  <div key={sec.id} className="rounded-lg border overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/50"
                      onClick={() => togglePanelSection(sec.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sec.color }}
                        />
                        <span className="text-xs font-medium">{sec.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {sectionFields.length}
                        </Badge>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="size-3.5 text-muted-foreground" />
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="px-2 pb-2 space-y-0.5">
                        {sectionFields.map(([key, field]) => {
                          const isSelected = selectedKey === key;
                          const isExpanded = expandedKey === key;
                          const isRenaming = editingLabelKey === key;

                          return (
                            <div key={key} data-testid={`coord-row-${key}`}>
                              {/* Main row */}
                              <div
                                className={`flex items-center gap-1 p-1.5 rounded text-xs cursor-pointer transition-colors ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                                onClick={() => {
                                  setSelectedKey(key);
                                  toggleExpanded(key);
                                }}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: sec.color }}
                                />

                                {/* Label: inline rename or display */}
                                {isRenaming ? (
                                  <input
                                    autoFocus
                                    className="flex-1 bg-muted/70 border rounded px-1 py-0.5 text-[11px] min-w-0"
                                    value={editingLabelValue}
                                    onChange={(e) => setEditingLabelValue(e.target.value)}
                                    onBlur={confirmRename}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") confirmRename();
                                      if (e.key === "Escape") { setEditingLabelKey(null); setEditingLabelValue(""); }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`rename-input-${key}`}
                                  />
                                ) : (
                                  <span className="flex-1 truncate text-[11px]">{field.label}</span>
                                )}

                                <span className="text-muted-foreground text-[10px] shrink-0">
                                  {field.type === "check" ? "☑" : field.type === "combo" ? "X+T" : "T"}
                                </span>

                                {/* Coords */}
                                <input
                                  type="number"
                                  value={Math.round(field.x * 10) / 10}
                                  onChange={(e) => handleCoordChange(key, "x", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-12 h-5 text-[10px] text-right bg-muted/50 border rounded px-1 tabular-nums"
                                  step="0.5"
                                  data-testid={`coord-x-${key}`}
                                />
                                <input
                                  type="number"
                                  value={Math.round(field.y * 10) / 10}
                                  onChange={(e) => handleCoordChange(key, "y", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-12 h-5 text-[10px] text-right bg-muted/50 border rounded px-1 tabular-nums"
                                  step="0.5"
                                  data-testid={`coord-y-${key}`}
                                />

                                {/* Action buttons */}
                                <button
                                  className="p-0.5 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); startRename(key, field.label); }}
                                  title="Renommer"
                                  data-testid={`rename-btn-${key}`}
                                >
                                  <Pencil className="size-3" />
                                </button>
                                <button
                                  className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteField(key, field.label); }}
                                  title="Supprimer"
                                  data-testid={`delete-btn-${key}`}
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>

                              {/* Expanded detail: fontSize + wordSpacing */}
                              {isExpanded && (
                                <div
                                  className="ml-4 mr-1 mt-1 mb-2 p-2 rounded-md bg-muted/30 border space-y-2.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Font size */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Type className="size-3" />
                                        <span>Taille police</span>
                                      </div>
                                      <span className="text-[10px] font-mono tabular-nums">{field.fontSize}pt</span>
                                    </div>
                                    <Slider
                                      value={[field.fontSize]}
                                      min={4}
                                      max={16}
                                      step={0.5}
                                      onValueChange={([v]) => updateFieldProp(key, "fontSize", v)}
                                      className="h-4"
                                      data-testid={`fontsize-slider-${key}`}
                                    />
                                  </div>

                                  {/* Word spacing — for text and combo fields */}
                                  {(field.type === "text" || field.type === "combo") && (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="text-[10px]">↔</span>
                                          <span>Espace entre mots</span>
                                        </div>
                                        <span className="text-[10px] font-mono tabular-nums">{field.wordSpacing}pt</span>
                                      </div>
                                      <Slider
                                        value={[field.wordSpacing]}
                                        min={0}
                                        max={30}
                                        step={0.5}
                                        onValueChange={([v]) => updateFieldProp(key, "wordSpacing", v)}
                                        className="h-4"
                                        data-testid={`wordspacing-slider-${key}`}
                                      />
                                    </div>
                                  )}

                                  {/* Combo order toggle */}
                                  {field.type === "combo" && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <span>⇄</span>
                                        <span>Ordre</span>
                                      </div>
                                      <Select
                                        value={field.comboOrder ?? "check_text"}
                                        onValueChange={(v) => updateFieldProp(key, "comboOrder", v)}
                                      >
                                        <SelectTrigger className="h-6 text-[10px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="check_text">X → Texte</SelectItem>
                                          <SelectItem value="text_check">Texte → X</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Info */}
              <div className="text-[10px] text-muted-foreground pt-2 space-y-1">
                <p>Glissez les marqueurs sur l'aperçu pour repositionner.</p>
                <p>Cliquez sur une ligne pour ajuster taille de police et espace entre les mots.</p>
                <p>Utilisez "Enregistrer par défaut" pour sauvegarder vos réglages.</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Ajouter un champ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du champ</Label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Ex: Commentaires"
                className="text-sm"
                data-testid="new-field-label"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as "text" | "check" | "combo")}>
                <SelectTrigger className="text-sm" data-testid="new-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte (T)</SelectItem>
                  <SelectItem value="check">Case à cocher (☑)</SelectItem>
                  <SelectItem value="combo">Combo (X + Texte)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newFieldType === "combo" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Ordre</Label>
                <Select value={newFieldComboOrder} onValueChange={(v) => setNewFieldComboOrder(v as ComboOrder)}>
                  <SelectTrigger className="text-sm" data-testid="new-field-combo-order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_text">X → Texte</SelectItem>
                    <SelectItem value="text_check">Texte → X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Section</Label>
              <Select value={newFieldSection} onValueChange={setNewFieldSection}>
                <SelectTrigger className="text-sm" data-testid="new-field-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALIBRATION_SECTIONS.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleAddField} disabled={!newFieldLabel.trim()} data-testid="confirm-add-field">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
