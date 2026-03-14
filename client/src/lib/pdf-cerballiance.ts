import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCalibration, type CalibrationMap, type FieldCoord } from "./calibration-store";

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
  prescripteur: string;
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
  // Custom fields added via calibration (key → value entered in form)
  customFields?: Record<string, string>;
}

// Page height for Y coordinate conversion (top-down to bottom-up)
const PH = 841.89;
// Convert top-down Y to pdf-lib bottom-up Y
function Y(topY: number): number {
  return PH - topY;
}

// Default font sizes (used as fallback)
const FS = 8;
const FS_SMALL = 6.5;

// Word separators — characters around which we add extra spacing
const WORD_SEP_RE = /(\s+|\/|-|\.|:)/;

// ================================================================
// Helper: read coordinate + properties from calibration store
// ================================================================
function coord(cal: CalibrationMap, key: string, defaultX: number, defaultY: number): [number, number] {
  const entry = cal[key];
  if (entry) return [entry.x, entry.y];
  return [defaultX, defaultY];
}

/** Get fontSize for a field, falling back to provided default */
function getFontSize(cal: CalibrationMap, key: string, defaultSize: number): number {
  const entry = cal[key];
  if (entry && typeof entry.fontSize === "number" && entry.fontSize > 0) return entry.fontSize;
  return defaultSize;
}

/** Get wordSpacing for a field, defaults to 0 */
function getWordSpacing(cal: CalibrationMap, key: string): number {
  const entry = cal[key];
  if (entry && typeof entry.wordSpacing === "number") return entry.wordSpacing;
  return 0;
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

  /**
   * Draw text at top-down coordinates.
   * If wordSpacing > 0, splits the string on word separators (space, /, -, .)
   * and adds extra spacing between the resulting tokens.
   */
  function textDraw(str: string, x: number, topY: number, size: number, bold: boolean, wordSpacing: number) {
    if (!str) return;

    if (wordSpacing <= 0) {
      // Normal draw — no extra spacing
      page.drawText(str, {
        x,
        y: Y(topY),
        size,
        font: bold ? fontBold : font,
        color: black,
      });
      return;
    }

    // Split on separators, keeping the separators as tokens
    const tokens = str.split(WORD_SEP_RE).filter(Boolean);
    const usedFont = bold ? fontBold : font;
    let curX = x;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      page.drawText(token, {
        x: curX,
        y: Y(topY),
        size,
        font: usedFont,
        color: black,
      });
      const tokenWidth = usedFont.widthOfTextAtSize(token, size);
      curX += tokenWidth;

      // Add extra spacing after every token except the last
      if (i < tokens.length - 1) {
        curX += wordSpacing;
      }
    }
  }

  /** Shorthand text draw using calibration key for size and wordSpacing */
  function text(str: string, calKey: string, x: number, topY: number, defaultSize = FS, bold = false) {
    const size = getFontSize(cal, calKey, defaultSize);
    const ws = getWordSpacing(cal, calKey);
    textDraw(str, x, topY, size, bold, ws);
  }

  // Helper: draw an X in a checkbox at top-down coordinates
  function check(x: number, topY: number, calKey?: string) {
    const size = calKey ? getFontSize(cal, calKey, 8) : 8;
    page.drawText("X", {
      x: x + 1,
      y: Y(topY) - 1,
      size,
      font: fontBold,
      color: black,
    });
  }

  // ============================================================
  // SECTION: Header / Administrative
  // ============================================================
  {
    const [px, py] = coord(cal, "text_prescripteur", 290, 102);
    text(data.prescripteur, "text_prescripteur", px, py);
  }
  {
    const [mx, my] = coord(cal, "text_medecinTraitant", 530, 97);
    text(data.medecinTraitant, "text_medecinTraitant", mx, my);
  }

  // Urgent checkbox
  if (data.urgent) {
    const [ux, uy] = coord(cal, "check_urgent", 492, 102);
    check(ux, uy, "check_urgent");
  }

  // ============================================================
  // SECTION: PRELEVEUR (IDE) — left side
  // ============================================================
  {
    const [x, y] = coord(cal, "text_ideName", 35, 167);
    text(data.ideName, "text_ideName", x, y);
  }
  {
    const [x, y] = coord(cal, "text_ideCabinet", 55, 180);
    text(data.ideCabinet, "text_ideCabinet", x, y);
  }
  {
    const [x, y] = coord(cal, "text_datePrelevement", 120, 195);
    text(data.datePrelevement, "text_datePrelevement", x, y);
  }
  {
    const [x, y] = coord(cal, "text_heurePrelevement", 130, 220);
    text(data.heurePrelevement, "text_heurePrelevement", x, y);
  }

  // ============================================================
  // SECTION: PATIENT — right side
  // ============================================================
  {
    const [x, y] = coord(cal, "text_nomUsuel", 340, 168);
    text(data.nomUsuel.toUpperCase(), "text_nomUsuel", x, y, FS, true);
  }
  {
    const [x, y] = coord(cal, "text_nomNaissance", 510, 163);
    text(data.nomUsuel.toUpperCase(), "text_nomNaissance", x, y);
  }
  {
    const [x, y] = coord(cal, "text_prenoms", 330, 180);
    text(data.prenoms, "text_prenoms", x, y);
  }

  // Sexe checkboxes
  if (data.sexe === "M") {
    const [x, y] = coord(cal, "check_sexeH", 505, 170);
    check(x, y, "check_sexeH");
  } else if (data.sexe === "F") {
    const [x, y] = coord(cal, "check_sexeF", 528, 170);
    check(x, y, "check_sexeF");
  }

  // Telephone
  {
    const [x, y] = coord(cal, "text_telephone", 490, 188);
    text(data.telephone, "text_telephone", x, y);
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
    text(formatted, "text_dateNaissance", x, y);
  }

  // Adresse
  {
    const [x, y] = coord(cal, "text_adresse", 330, 210);
    text(data.adresse, "text_adresse", x, y, FS_SMALL);
  }

  // N°SS
  {
    const [x, y] = coord(cal, "text_numSecu", 310, 222);
    text(data.numSecu, "text_numSecu", x, y);
  }

  // ============================================================
  // SECTION: RENSEIGNEMENTS CLINIQUES
  // ============================================================
  if (data.grossesse) {
    const [x, y] = coord(cal, "check_grossesse", 250, 263);
    check(x, y, "check_grossesse");
  }
  if (data.fievre) {
    const [x, y] = coord(cal, "check_fievre", 345, 263);
    check(x, y, "check_fievre");
  }

  // Traitements en cours
  if (data.traitements) {
    const [x, y] = coord(cal, "text_traitements", 130, 270);
    text(data.traitements, "text_traitements", x, y, FS_SMALL);
  }

  // ============================================================
  // SECTION: ANTICOAGULANT
  // ============================================================
  if (data.anticoagulant && data.anticoagulant !== "none" && data.anticoagulant !== "") {
    // Check the anticoagulant radio
    const acKey = `check_${data.anticoagulant}`;
    const acEntry = cal[acKey];
    if (acEntry) {
      check(acEntry.x, acEntry.y, acKey);
    }
    // Posologie text
    if (data.posologie) {
      const [x, y] = coord(cal, "text_posologie", 200, 377);
      text(data.posologie, "text_posologie", x, y);
    }
    // INR cible
    if (data.inrCible) {
      if (data.inrCible === "2-3") {
        const [x, y] = coord(cal, "check_inr23", 432, 377);
        check(x, y, "check_inr23");
      } else if (data.inrCible === "3-4.5" || data.inrCible === "3-4,5") {
        const [x, y] = coord(cal, "check_inr345", 492, 377);
        check(x, y, "check_inr345");
      } else {
        textDraw(data.inrCible, 492, 379, FS, false, 0);
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
        check(entry.x, entry.y, key);
      }
    }
  }

  // ============================================================
  // SECTION: CUSTOM FIELDS (user-added via calibration)
  // ============================================================
  if (data.customFields) {
    for (const [key, value] of Object.entries(data.customFields)) {
      // Skip internal combo-check keys (they're handled by the combo_ parent key)
      if (key.includes(":checked")) continue;

      const entry = cal[key];
      if (!entry) continue;

      if (entry.type === "combo") {
        // Combo field: draw both X (if checked) and text side by side
        const isChecked = data.customFields[`${key}:checked`] === "true";
        const textValue = value || "";
        const order = entry.comboOrder ?? "check_text";
        const size = getFontSize(cal, key, FS);
        const ws = getWordSpacing(cal, key);
        const usedFont = font;
        const xBoldFont = fontBold;

        if (order === "check_text") {
          // X first, then text
          let curX = entry.x;
          if (isChecked) {
            page.drawText("X", { x: curX + 1, y: Y(entry.y) - 1, size, font: xBoldFont, color: black });
          }
          const xWidth = xBoldFont.widthOfTextAtSize("X", size);
          curX += xWidth + (ws > 0 ? ws : 4); // use wordSpacing or 4pt gap
          if (textValue) {
            textDraw(textValue, curX, entry.y, size, false, ws);
          }
        } else {
          // Text first, then X
          let curX = entry.x;
          if (textValue) {
            // Calculate text width to position X after it
            const tokens = ws > 0 ? textValue.split(WORD_SEP_RE).filter(Boolean) : [textValue];
            let textWidth = 0;
            for (let i = 0; i < tokens.length; i++) {
              textWidth += usedFont.widthOfTextAtSize(tokens[i], size);
              if (ws > 0 && i < tokens.length - 1) textWidth += ws;
            }
            textDraw(textValue, curX, entry.y, size, false, ws);
            curX += textWidth + (ws > 0 ? ws : 4);
          }
          if (isChecked) {
            page.drawText("X", { x: curX + 1, y: Y(entry.y) - 1, size, font: xBoldFont, color: black });
          }
        }
      } else if (entry.type === "check") {
        // Custom checkbox — draw X if value is truthy ("true")
        if (value === "true") {
          check(entry.x, entry.y, key);
        }
      } else {
        // Custom text field
        if (value) text(value, key, entry.x, entry.y);
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
