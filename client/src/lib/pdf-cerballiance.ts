import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCalibration, type CalibrationMap } from "./calibration-store";

interface CerballiancePDFData {
  // IDE (nurse) info
  ideName: string;
  idePhone: string;
  ideCabinet: string;
  ideRpps: string;
  ideAdeli: string;
  // Patient info
  nomUsuel: string;
  prenoms: string;
  dateNaissance: string;
  sexe: string;
  adresse: string;
  telephone: string;
  numSecu: string;
  medecinTraitant: string;
  // Prelevement
  datePrelevement: string;
  heurePrelevement: string;
  grossesse: boolean;
  fievre: boolean;
  traitements: string;
  urgent: boolean;
  // Anticoagulant
  anticoagulant: string;
  posologie: string;
  inrCible: string;
  // Analyses grouped by section
  analysesBySection: { label: string; color: string; analyses: string[] }[];
}

// Page height for Y coordinate conversion (top-down to bottom-up)
const PH = 841.89;
// Convert top-down Y to pdf-lib bottom-up Y
function Y(topY: number): number {
  return PH - topY;
}

// Font size for form fields
const FS = 8;
const FS_SMALL = 6.5;

// ================================================================
// Helper: read coordinate from calibration store
// key format: "check_AnalyseName" or "text_fieldName"
// Falls back to provided default [x, y] if not found
// ================================================================
function coord(cal: CalibrationMap, key: string, defaultX: number, defaultY: number): [number, number] {
  const entry = cal[key];
  if (entry) return [entry.x, entry.y];
  return [defaultX, defaultY];
}

export async function generateCerballiancePDF(data: CerballiancePDFData): Promise<void> {
  // Read current calibration
  const cal = getCalibration();

  // Fetch the blank official form
  const formUrl = new URL("/fiche-labo-vierge.pdf", window.location.origin).href;
  const formBytes = await fetch(formUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(formBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];
  const black = rgb(0, 0, 0);

  // Helper: draw text at top-down coordinates
  function text(str: string, x: number, topY: number, size = FS, bold = false) {
    if (!str) return;
    page.drawText(str, {
      x,
      y: Y(topY),
      size,
      font: bold ? fontBold : font,
      color: black,
    });
  }

  // Helper: draw an X in a checkbox at top-down coordinates
  // The X is drawn centered inside a ~8pt checkbox
  function check(x: number, topY: number) {
    page.drawText("X", {
      x: x + 1,
      y: Y(topY) - 1,
      size: 8,
      font: fontBold,
      color: black,
    });
  }

  // ============================================================
  // SECTION: Header / Administrative
  // ============================================================
  {
    const [px, py] = coord(cal, "text_prescripteur", 290, 102);
    text(data.medecinTraitant, px, py, FS);
  }
  {
    const [mx, my] = coord(cal, "text_medecinTraitant", 530, 97);
    text(data.medecinTraitant, mx, my, FS);
  }

  // Urgent checkbox
  if (data.urgent) {
    const [ux, uy] = coord(cal, "check_urgent", 492, 102);
    check(ux, uy);
  }

  // ============================================================
  // SECTION: PRELEVEUR (IDE) — left side
  // ============================================================
  {
    const [x, y] = coord(cal, "text_ideName", 35, 167);
    text(data.ideName, x, y, FS);
  }
  {
    const [x, y] = coord(cal, "text_ideCabinet", 55, 180);
    text(data.ideCabinet, x, y, FS);
  }
  {
    const [x, y] = coord(cal, "text_datePrelevement", 120, 195);
    text(data.datePrelevement, x, y, FS);
  }
  {
    const [x, y] = coord(cal, "text_heurePrelevement", 130, 220);
    text(data.heurePrelevement, x, y, FS);
  }

  // ============================================================
  // SECTION: PATIENT — right side
  // ============================================================
  {
    const [x, y] = coord(cal, "text_nomUsuel", 340, 168);
    text(data.nomUsuel.toUpperCase(), x, y, FS, true);
  }
  {
    const [x, y] = coord(cal, "text_nomNaissance", 510, 163);
    text(data.nomUsuel.toUpperCase(), x, y, FS); // Nom de naissance
  }
  {
    const [x, y] = coord(cal, "text_prenoms", 330, 180);
    text(data.prenoms, x, y, FS);
  }

  // Sexe checkboxes
  if (data.sexe === "M") {
    const [x, y] = coord(cal, "check_sexeH", 505, 170);
    check(x, y);
  } else if (data.sexe === "F") {
    const [x, y] = coord(cal, "check_sexeF", 528, 170);
    check(x, y);
  }

  // Telephone
  {
    const [x, y] = coord(cal, "text_telephone", 490, 188);
    text(data.telephone, x, y, FS);
  }

  // Né(e) le — date de naissance
  if (data.dateNaissance) {
    const dn = data.dateNaissance;
    let formatted = dn;
    if (dn.includes("-")) {
      const parts = dn.split("-");
      if (parts.length === 3) {
        formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const [x, y] = coord(cal, "text_dateNaissance", 325, 195);
    text(formatted, x, y, FS);
  }

  // Adresse
  {
    const [x, y] = coord(cal, "text_adresse", 330, 210);
    text(data.adresse, x, y, FS_SMALL);
  }

  // N°SS
  {
    const [x, y] = coord(cal, "text_numSecu", 310, 222);
    text(data.numSecu, x, y, FS);
  }

  // ============================================================
  // SECTION: RENSEIGNEMENTS CLINIQUES
  // ============================================================
  if (data.grossesse) {
    const [x, y] = coord(cal, "check_grossesse", 250, 263);
    check(x, y);
  }
  if (data.fievre) {
    const [x, y] = coord(cal, "check_fievre", 345, 263);
    check(x, y);
  }

  // Traitements en cours
  if (data.traitements) {
    const [x, y] = coord(cal, "text_traitements", 130, 270);
    text(data.traitements, x, y, FS_SMALL);
  }

  // ============================================================
  // SECTION: ANTICOAGULANT
  // ============================================================
  if (data.anticoagulant && data.anticoagulant !== "none" && data.anticoagulant !== "") {
    // Check the anticoagulant radio
    const acKey = `check_${data.anticoagulant}`;
    const acEntry = cal[acKey];
    if (acEntry) {
      check(acEntry.x, acEntry.y);
    }
    // Posologie text
    if (data.posologie) {
      const [x, y] = coord(cal, "text_posologie", 200, 377);
      text(data.posologie, x, y, FS);
    }
    // INR cible
    if (data.inrCible) {
      if (data.inrCible === "2-3") {
        const [x, y] = coord(cal, "check_inr23", 432, 377);
        check(x, y);
      } else if (data.inrCible === "3-4.5" || data.inrCible === "3-4,5") {
        const [x, y] = coord(cal, "check_inr345", 492, 377);
        check(x, y);
      } else {
        text(data.inrCible, 492, 379, FS);
      }
    }
  }

  // ============================================================
  // SECTION: ANALYSES — Check boxes on the form
  // ============================================================
  for (const section of data.analysesBySection) {
    for (const analysis of section.analyses) {
      const key = `check_${analysis}`;
      const entry = cal[key];
      if (entry) {
        check(entry.x, entry.y);
      }
    }
  }

  // ============================================================
  // Save and download
  // ============================================================
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Cerballiance_${data.nomUsuel.toUpperCase()}_${data.prenoms}_${data.datePrelevement}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
