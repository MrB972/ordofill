import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
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
  GripVertical,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  useCalibration,
  getCalibration,
  updateFieldCoord,
  resetCalibration,
  exportCalibrationJSON,
  importCalibrationJSON,
  CALIBRATION_SECTIONS,
  type CalibrationMap,
  type FieldCoord,
} from "@/lib/calibration-store";
import { generateCerballiancePDF } from "@/lib/pdf-cerballiance";

// PDF page dimensions (points)
const PDF_W = 595.276;
const PDF_H = 841.89;

export default function CalibrationPage() {
  const { toast } = useToast();
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
  // PDF image loaded state
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  // Mobile panel
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Convert PDF to image for background display
  useEffect(() => {
    async function renderPdf() {
      try {
        // We'll use pdf.js to render the blank form to canvas
        const pdfjsLib = await import("pdfjs-dist");
        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const formUrl = new URL("/fiche-labo-vierge.pdf", window.location.origin).href;
        const loadingTask = pdfjsLib.getDocument(formUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Render at 2x for quality
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        setPdfImageUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("Failed to render PDF:", err);
        // Fallback: just use the PDF URL directly (won't show as image)
        toast({
          title: "Erreur de rendu PDF",
          description: "Impossible de charger l'aperçu du formulaire",
          variant: "destructive",
        });
      }
    }
    renderPdf();
  }, []);

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
      // Clamp
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
            {/* PDF background */}
            {pdfImageUrl ? (
              <img
                src={pdfImageUrl}
                alt="Formulaire vierge Cerballiance"
                className="absolute inset-0 w-full h-full"
                style={{ imageRendering: "auto" }}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Chargement du formulaire...
              </div>
            )}

            {/* Markers overlay */}
            {showMarkers &&
              visibleFields.map(([key, field]) => {
                const screenX = (field.x / PDF_W) * 100;
                const screenY = (field.y / PDF_H) * 100;
                const isSelected = selectedKey === key;
                const isDragged = dragging === key;
                const color = getSectionColor(field.section);
                const markerSize = field.type === "check" ? 8 : 6;

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
                    {/* Label tooltip (only show when zoomed in enough or selected) */}
                    {(isSelected || zoom >= 1.5) && (
                      <div
                        className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] px-1 py-0.5 rounded font-medium pointer-events-none"
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

        {/* Side panel: coordinates list */}
        <div className={`${showSidePanel ? "block" : "hidden sm:block"} w-full sm:w-[320px] sm:min-w-[280px] border-l bg-background`}>
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
                      <div className="px-2 pb-2 space-y-1">
                        {sectionFields.map(([key, field]) => {
                          const isSelected = selectedKey === key;
                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-1.5 p-1.5 rounded text-xs cursor-pointer transition-colors ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                              onClick={() => setSelectedKey(key)}
                              data-testid={`coord-row-${key}`}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: sec.color }}
                              />
                              <span className="flex-1 truncate text-[11px]">{field.label}</span>
                              <span className="text-muted-foreground text-[10px] shrink-0">
                                {field.type === "check" ? "☑" : "T"}
                              </span>
                              <input
                                type="number"
                                value={Math.round(field.x * 10) / 10}
                                onChange={(e) => handleCoordChange(key, "x", e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 h-5 text-[10px] text-right bg-muted/50 border rounded px-1 tabular-nums"
                                step="0.5"
                                data-testid={`coord-x-${key}`}
                              />
                              <input
                                type="number"
                                value={Math.round(field.y * 10) / 10}
                                onChange={(e) => handleCoordChange(key, "y", e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 h-5 text-[10px] text-right bg-muted/50 border rounded px-1 tabular-nums"
                                step="0.5"
                                data-testid={`coord-y-${key}`}
                              />
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
                <p>Ajustez finement avec les champs numériques (X, Y en points PDF).</p>
                <p>Utilisez Exporter/Importer pour sauvegarder vos réglages.</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
