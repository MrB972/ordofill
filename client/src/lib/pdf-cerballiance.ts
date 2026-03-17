import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCalibration, waitForCalibration, PAGE2_SECTIONS, type CalibrationMap, type FieldCoord } from "./calibration-store";

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
  mutuelle: string;
  finDeDroit: string;
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

/**
 * Convert yyyy-mm-dd to dd/mm/yyyy. Returns original string if not a date.
 */
function formatDateFR(value: string): string {
  if (!value) return value;
  if (value.includes("-")) {
    const parts = value.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return value;
}

export async function generateCerballiancePDF(data: CerballiancePDFData): Promise<void> {
  // Ensure calibration has been loaded from Supabase before proceeding
  await waitForCalibration();

  // Read current calibration
  const cal = getCalibration();
  console.log(`[PDF] Generating with ${Object.keys(cal).length} calibration fields`);
  const sample = cal["check_grossesse"];
  if (sample) console.log(`[PDF] check_grossesse: x=${sample.x}, y=${sample.y}`);

  // Fetch the blank official form
  const formUrl = new URL("/fiche-labo-vierge.pdf", window.location.origin).href;
  const formBytes = await fetch(formUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(formBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const page2 = pages.length > 1 ? pages[1] : page;
  const black = rgb(0, 0, 0);

  /** Determine which page a calibration key belongs to based on its section. */
  function getTargetPage(calKey: string) {
    const entry = cal[calKey];
    if (entry && entry.section && PAGE2_SECTIONS.has(entry.section)) return page2;
    return page;
  }

  /**
   * Draw text at top-down coordinates on a given page.
   * If wordSpacing > 0, splits the string on word separators (space, /, -, .)
   * and adds extra spacing between the resulting tokens.
   */
  function textDraw(str: string, x: number, topY: number, size: number, bold: boolean, wordSpacing: number, targetPage = page) {
    if (!str) return;

    if (wordSpacing <= 0) {
      // Normal draw — no extra spacing
      targetPage.drawText(str, {
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
      targetPage.drawText(token, {
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

  /** Shorthand text draw using calibration key for size, wordSpacing, and target page */
  function text(str: string, calKey: string, x: number, topY: number, defaultSize = FS, bold = false) {
    const size = getFontSize(cal, calKey, defaultSize);
    const ws = getWordSpacing(cal, calKey);
    textDraw(str, x, topY, size, bold, ws, getTargetPage(calKey));
  }

  // Helper: draw an X in a checkbox at top-down coordinates.
  // The calibration preview uses CSS transform: translate(-25%, -60%)
  // so the calibrated (x,y) is at ~25% of X-width from left, ~60% of height from top.
  // pdf-lib drawText anchors at baseline-left, so we must offset accordingly.
  function check(x: number, topY: number, calKey?: string) {
    const size = calKey ? getFontSize(cal, calKey, 8) : 8;
    const target = calKey ? getTargetPage(calKey) : page;
    // Match CSS translate(-25%, -60%): shift left by 25% of char width, 
    // and compute baseline from the 60%-from-top anchor point
    const charWidth = fontBold.widthOfTextAtSize("X", size);
    const xOffset = -0.25 * charWidth;
    // CSS: visual_top = y - 0.60*fontSize, baseline = visual_top + capHeight
    // capHeight ≈ 0.718 * fontSize for Helvetica
    // So baseline_top_down = y - 0.60*size + 0.718*size = y + 0.118*size
    // pdf-lib baseline_y = PH - baseline_top_down = Y(y) - 0.118*size
    const yOffset = -0.118 * size;
    target.drawText("X", {
      x: x + xOffset,
      y: Y(topY) + yOffset,
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
    text(formatDateFR(data.datePrelevement), "text_datePrelevement", x, y);
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
    const formatted = formatDateFR(data.dateNaissance);
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
  // SECTION: RÉSULTATS + PIÈCE JUSTIFICATIVE + MUTUELLE + FIN DE DROIT
  // ============================================================
  {
    // Résultats checkboxes — these map to calibration keys
    const resultatsChecks: [boolean, string][] = [
      [!!data.customFields?.["resultats_medFaxer"], "check_\u00e0_Faxer"],
      [!!data.customFields?.["resultats_medTelephoner"], "check_\u00e0_t\u00e9l\u00e9phoner"],
      [!!data.customFields?.["resultats_medPoster"], "check_\u00e0_poster"],
      [!!data.customFields?.["resultats_ideTelephoner"], "check_\u00e0_t\u00e9l\u00e9phoner_1"],
      [!!data.customFields?.["resultats_ideSms"], "check_SMS_avec_consentement_patient"],
      [!!data.customFields?.["resultats_patLabo"], "check_au_laboratoire"],
      [!!data.customFields?.["resultats_patInternet"], "check_Internet"],
      [!!data.customFields?.["resultats_patSms"], "check_SMS"],
      [!!data.customFields?.["resultats_patOppose"], "check_Le_patient_soppose_\u00e0_la_communication_de_r\u00e9sultats_\u00e0_lIDE"],
      [!!data.customFields?.["resultats_controle"], "check_Contr\u00f4le_demand\u00e9"],
      [!!data.customFields?.["piece_cni"], "check_CNI"],
      [!!data.customFields?.["piece_passeport"], "check_Passeport"],
      [!!data.customFields?.["piece_titre"], "check_Titre_ou_carte_de_s\u00e9jour"],
    ];
    for (const [checked, calKey] of resultatsChecks) {
      if (checked) {
        const entry = cal[calKey];
        if (entry) check(entry.x, entry.y, calKey);
      }
    }
    // Mutuelle text
    if (data.mutuelle) {
      const [x, y] = coord(cal, "text_mutuelle", 380, 225);
      text(data.mutuelle, "text_mutuelle", x, y);
    }
    // Fin de droit
    if (data.finDeDroit) {
      const formatted = formatDateFR(data.finDeDroit);
      const [x, y] = coord(cal, "text_finDeDroit", 480, 225);
      text(formatted, "text_finDeDroit", x, y);
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

      if (entry.type === "combo" || entry.type === "combo_date") {
        // Combo field: draw both X (if checked) and text/date side by side
        const isChecked = data.customFields[`${key}:checked`] === "true";
        // For combo_date: convert yyyy-mm-dd → dd/mm/yyyy
        let textValue = value || "";
        if (entry.type === "combo_date" && textValue && textValue.includes("-")) {
          const parts = textValue.split("-");
          if (parts.length === 3) textValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const order = entry.comboOrder ?? "check_text";
        const size = getFontSize(cal, key, FS);
        const ws = getWordSpacing(cal, key);
        const usedFont = font;
        const xBoldFont = fontBold;
        const targetPage = getTargetPage(key);

        // Combo preview uses translate(0, -80%) — same as text, no special check offset.
        // The X in a combo is rendered as inline text, not a standalone checkbox.
        if (order === "check_text") {
          // X first, then text
          let curX = entry.x;
          if (isChecked) {
            targetPage.drawText("X", { x: curX, y: Y(entry.y), size, font: xBoldFont, color: black });
          }
          const xWidth = xBoldFont.widthOfTextAtSize("X", size);
          curX += xWidth + (ws > 0 ? ws : 4); // use wordSpacing or 4pt gap
          if (textValue) {
            textDraw(textValue, curX, entry.y, size, false, ws, targetPage);
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
            textDraw(textValue, curX, entry.y, size, false, ws, targetPage);
            curX += textWidth + (ws > 0 ? ws : 4);
          }
          if (isChecked) {
            targetPage.drawText("X", { x: curX, y: Y(entry.y), size, font: xBoldFont, color: black });
          }
        }
      } else if (entry.type === "check") {
        // Custom checkbox — draw X if value is truthy ("true")
        if (value === "true") {
          check(entry.x, entry.y, key);
        }
      } else {
        // Custom text field — auto-convert yyyy-mm-dd dates to dd/mm/yyyy
        if (value) {
          const formatted = formatDateFR(value);
          text(formatted, key, entry.x, entry.y);
        }
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
  link.download = `Cerballiance_${data.nomUsuel.toUpperCase()}_${data.prenoms}_${formatDateFR(data.datePrelevement)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
