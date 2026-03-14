import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

// ---- Coordinate mappings based on detailed grid analysis ----
// All Y values are TOP-DOWN (converted via Y() helper at render time)
// Grid analysis done at 3x zoom with 10pt increments

// Page 1 — TUBE BLEU section
// From grid: "1 TUBE BLEU REMPLI..." header at ~t347, checkboxes at ~t356
// INR checkbox at x~28, TCA at x~95, Fibrine at x~175, TP at x~285, AT3 at x~350
// Plaquettes sur tube citrate at x~490, Ddimeres at x~538 (far right)
const TUBE_BLEU_CHECKS: Record<string, [number, number]> = {
  "INR":                           [28,  357],
  "TCA":                           [95,  357],
  "Fibrine":                       [175, 357],
  "TP":                            [285, 357],
  "AT3":                           [350, 357],
  "Plaquettes sur tube citrate":   [490, 357],
  "Ddimeres":                      [538, 357],
};

// Page 1 — TUBE JAUNE 5mL section — 4 columns of checkboxes
// Positions calibrated via grid overlay analysis at 3-4x zoom
const COL1_X = 18;
const COL2_X = 297;
const COL3_X = 468;
const COL4_X = 485;

// First row Y from pixel analysis: checkbox top at ~t404
// Row height: ~10.5pt per row
const JAUNE_START_Y = 405;
const JAUNE_ROW_H = 9.0;

function jauneY(row: number): number { return JAUNE_START_Y + row * JAUNE_ROW_H; }

const TUBE_JAUNE_CHECKS: Record<string, [number, number]> = {
  // Column 1 (18 analyses from ACE to CMV)
  "ACE":                          [COL1_X, jauneY(0)],
  "Acide urique":                 [COL1_X, jauneY(1)],
  "AFP":                          [COL1_X, jauneY(2)],
  "Ag HBS":                       [COL1_X, jauneY(3)],
  "ALAT / ASAT":                  [COL1_X, jauneY(4)],
  "Albumine":                     [COL1_X, jauneY(5)],
  "Apo A / Apo B":                [COL1_X, jauneY(6)],
  "B2 microglobuline":            [COL1_X, jauneY(7)],
  "Bicarbonates":                 [COL1_X, jauneY(8)],
  "Bilan hepatique":              [COL1_X, jauneY(9)],
  "Bilan lipidique":              [COL1_X, jauneY(10)],
  "Bilirubine":                   [COL1_X, jauneY(11)],
  "CA 125":                       [COL1_X, jauneY(12)],
  "CA 153.3":                     [COL1_X, jauneY(13)],
  "CA 19.9":                      [COL1_X, jauneY(14)],
  "Calcium / Calcium corrige":    [COL1_X, jauneY(15)],
  "CMV":                          [COL1_X, jauneY(16)],
  // Column 2
  "Cholesterol / triglycerides":  [COL2_X, jauneY(0)],
  "Coefficient de saturation":    [COL2_X, jauneY(1)],
  "Cortisol":                     [COL2_X, jauneY(2)],
  "CPK":                          [COL2_X, jauneY(3)],
  "Creatinine":                   [COL2_X, jauneY(4)],
  "CRP / CRP us":                 [COL2_X, jauneY(5)],
  "DHEAS":                        [COL2_X, jauneY(6)],
  "DFG":                          [COL2_X, jauneY(7)],
  "Estradiol":                    [COL2_X, jauneY(10)],
  "Fer serique":                  [COL2_X, jauneY(11)],
  "Ferritine":                    [COL2_X, jauneY(12)],
  "Folates seriques":             [COL2_X, jauneY(13)],
  "Fructosamine":                 [COL2_X, jauneY(15)],
  "GGT":                          [COL2_X, jauneY(16)],
  // Column 3
  "Hepatite A / B / C":           [COL3_X, jauneY(0)],
  "HIV":                          [COL3_X, jauneY(1)],
  "HTLV":                         [COL3_X, jauneY(2)],
  "IgA / IgG / IgM / IgE totales": [COL3_X, jauneY(3)],
  "Ionogramme complet":           [COL3_X, jauneY(4)],
  "LDH":                          [COL3_X, jauneY(6)],
  "Lipase":                       [COL3_X, jauneY(7)],
  "Magnesium":                    [COL3_X, jauneY(8)],
  "Na / K / Cl":                  [COL3_X, jauneY(9)],
  "PAL":                          [COL3_X, jauneY(10)],
  "Phosphore":                    [COL3_X, jauneY(11)],
  "Prealbumine":                  [COL3_X, jauneY(12)],
  "Progesterone":                 [COL3_X, jauneY(13)],
  "Prolactine":                   [COL3_X, jauneY(14)],
  "Protides":                     [COL3_X, jauneY(15)],
  // Column 4
  "PSA / PSA LIBRE":              [COL4_X, jauneY(0)],
  "PTH":                          [COL4_X, jauneY(1)],
  "Rubeole":                      [COL4_X, jauneY(2)],
  "Syphilis":                     [COL4_X, jauneY(3)],
  "T3L / T4L":                    [COL4_X, jauneY(4)],
  "Testosterone":                 [COL4_X, jauneY(5)],
  "Toxoplasmose":                 [COL4_X, jauneY(6)],
  "TSH":                          [COL4_X, jauneY(7)],
  "Uree":                         [COL4_X, jauneY(8)],
  "Vit B12":                      [COL4_X, jauneY(9)],
  "Vit D":                        [COL4_X, jauneY(10)],
};

// Analyses cardiaques section
// From grid: NTproBNP and Troponine checkboxes at approximately t ≈ 590
// Electrophorese at t ≈ 603
const CARDIAQUES_CHECKS: Record<string, [number, number]> = {
  "NTproBNP":                     [18,  590],
  "Troponine":                    [102, 590],
  "Electrophorese des protides / Immunotypage": [18, 604],
};

// Tube jaune petit 3.5mL (rhumato)
// From grid: ENA/AAN row at t ≈ 630
const RHUMATO_CHECKS: Record<string, [number, number]> = {
  "ENA / AAN / ACADN":            [18,  631],
  "Facteurs rhumatoides":         [145, 631],
  "Latex Waaler-Rose":            [300, 631],
};

// Serologies
// From grid: Serologie H.Pylori row at t ≈ 672
const SEROLOGIES_CHECKS: Record<string, [number, number]> = {
  "Serologie H.Pylori":           [18,  672],
  "Serologie C.trachomatis IgG":  [200, 672],
  "Procalcitonie":                [415, 672],
};

// Tube rouge (Chlordecone)
// From grid: Chlordecone at t ≈ 688
const CHLORDECONE_CHECKS: Record<string, [number, number]> = {
  "Chlordecone":                  [18, 688],
};

// Tube vert (Bicarbonates)
// From grid: at t ≈ 688, right side of page (x ≈ 420)
const VERT_CHECKS: Record<string, [number, number]> = {
  "Bicarbonates / Reserve alcaline": [420, 688],
};

// Tube violet EDTA
// From grid: "1 TUBE EDTA VIOLET..." header at ~t714
// NFS, VS, Reticulocytes row at t ≈ 726
// BNP at x~305 t726, HbA1C at x~445 t726
// Plaquettes at t ≈ 736
// Electrophorese HB at t ≈ 750
// Second violet section header at ~t770
// RAI at t ≈ 782
// Groupe sanguin at t ≈ 782
const VIOLET_CHECKS: Record<string, [number, number]> = {
  "NFS":                          [18,  726],
  "VS":                           [72,  726],
  "Reticulocytes":                [115, 726],
  "BNP":                          [305, 726],
  "HbA1C":                        [445, 726],
  "Plaquettes":                   [18,  737],
  "Electrophorese HB":            [18,  752],
  "RAI":                          [18,  782],
  "Groupe sanguin":               [200, 782],
};

// Tube gris (right side of page)
// From grid: Glycemie a Jeun at t ≈ 726, x ≈ 420
// GPP at t ≈ 740, x ≈ 420
const GRIS_CHECKS: Record<string, [number, number]> = {
  "Glycemie a Jeun":              [420, 726],
  "GPP":                          [420, 740],
};

// Anticoagulant name mapping
// From grid: Traitements row at t ≈ 368
// Sintrom at x~85, Previscan at x~150, Coumadine at x~230, Fraxi at x~320, 
// Lovenox at x~365, Innohep at x~425, Calciparine at x~490, Orgaran at x~560
// Second row (Rivaroxaban etc): t ≈ 378
// But these are radio buttons (circles), not checkboxes. Mark with filled circle or X.
const ANTICOAGULANT_CHECKS: Record<string, [number, number]> = {
  "Sintrom":     [93,  369],
  "Previscan":   [163, 369],
  "Coumadine":   [233, 369],
  "Fraxi":       [323, 369],
  "Lovenox":     [368, 369],
  "Innohep":     [433, 369],
  "Calciparine": [503, 369],
  "Orgaran":     [563, 369],
  "Rivaroxaban": [395, 380],
  "Apixaban":    [455, 380],
  "Dabigatran":  [530, 380],
};

// Merge all checkbox maps for lookup
const ALL_CHECKS: Record<string, [number, number]> = {
  ...TUBE_BLEU_CHECKS,
  ...TUBE_JAUNE_CHECKS,
  ...CARDIAQUES_CHECKS,
  ...RHUMATO_CHECKS,
  ...SEROLOGIES_CHECKS,
  ...CHLORDECONE_CHECKS,
  ...VERT_CHECKS,
  ...VIOLET_CHECKS,
  ...GRIS_CHECKS,
};

export async function generateCerballiancePDF(data: CerballiancePDFData): Promise<void> {
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
  function check(x: number, topY: number) {
    page.drawText("X", {
      x: x + 1,
      y: Y(topY) - 1,
      size: 9,
      font: fontBold,
      color: black,
    });
  }

  // ============================================================
  // SECTION: Header / Administrative
  // ============================================================
  // From grid: "Prescripteur :" label at ~t103, field starts after label at ~x230
  // "Médecin traitant :" label right side at ~x385, field at ~x480
  text(data.medecinTraitant, 225, 103, FS);
  // Médecin traitant (right side)
  text(data.medecinTraitant, 480, 103, FS);

  // Urgent checkbox — from grid: checkbox is right of "□ Urgent" label
  if (data.urgent) {
    check(525, 105);
  }

  // ============================================================
  // SECTION: PRELEVEUR (IDE) — left side
  // ============================================================
  // From grid: "Nom" row at t ≈ 162, "Cabinet" row at t ≈ 175
  // "Date du prelevement" row at t ≈ 195, "Heure du prelevement" row at t ≈ 213
  text(data.ideName, 48, 165, FS);
  text(data.ideCabinet, 60, 177, FS);
  text(data.datePrelevement, 125, 195, FS);
  text(data.heurePrelevement, 135, 215, FS);

  // ============================================================
  // SECTION: PATIENT — right side
  // ============================================================
  // From grid detail-patient:
  // "Nom usuel" field at ~x265, t ≈ 162
  // "Nom de naissance" at ~x430, t ≈ 162
  // "Prenoms" at ~x265, t ≈ 175
  // "Sexe: H F" checkboxes at right side: H at x~495, F at x~515, t ≈ 175
  // "Tel" at x~455, t ≈ 190
  // "Ne(e) le" at x~265, t ≈ 195
  // "Adresse" at x~265, t ≈ 208
  // "N°SS" at x~265, t ≈ 220
  text(data.nomUsuel.toUpperCase(), 265, 164, FS, true);
  text(data.nomUsuel.toUpperCase(), 430, 164, FS);  // Nom de naissance
  text(data.prenoms, 265, 177, FS);

  // Sexe checkboxes — H checkbox then F checkbox at right side
  if (data.sexe === "M") {
    check(500, 173);
  } else if (data.sexe === "F") {
    check(525, 173);
  }

  // Telephone
  text(data.telephone, 455, 190, FS);

  // Ne(e) le — date de naissance
  if (data.dateNaissance) {
    const dn = data.dateNaissance;
    let formatted = dn;
    if (dn.includes("-")) {
      const parts = dn.split("-");
      if (parts.length === 3) {
        formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    text(formatted, 265, 197, FS);
  }

  // Adresse
  text(data.adresse, 265, 210, FS_SMALL);

  // N°SS
  text(data.numSecu, 265, 222, FS);

  // ============================================================
  // SECTION: RENSEIGNEMENTS CLINIQUES
  // ============================================================
  // From grid detail-clinical:
  // "Grossesse en cours" circle at ~x305, t ≈ 268
  // "Fievre" circle at ~x380, t ≈ 268
  if (data.grossesse) {
    check(305, 265);
  }
  if (data.fievre) {
    check(380, 265);
  }

  // Traitements en cours — text field at t ≈ 280
  if (data.traitements) {
    text(data.traitements, 145, 280, FS_SMALL);
  }

  // ============================================================
  // SECTION: ANTICOAGULANT
  // ============================================================
  if (data.anticoagulant && data.anticoagulant !== "none" && data.anticoagulant !== "") {
    const pos = ANTICOAGULANT_CHECKS[data.anticoagulant];
    if (pos) {
      check(pos[0], pos[1]);
    }
    // Posologie — from grid: at ~x125, t ≈ 380
    if (data.posologie) {
      text(data.posologie, 125, 380, FS);
    }
    // INR cible — from grid: "INR cible 2-3" at ~x425, "3-4,5" at ~x485, t ≈ 378
    if (data.inrCible) {
      if (data.inrCible === "2-3") {
        check(438, 380);
      } else if (data.inrCible === "3-4.5" || data.inrCible === "3-4,5") {
        check(498, 380);
      } else {
        text(data.inrCible, 498, 382, FS);
      }
    }
  }

  // ============================================================
  // SECTION: ANALYSES — Check boxes on the form
  // ============================================================
  for (const section of data.analysesBySection) {
    for (const analysis of section.analyses) {
      const pos = ALL_CHECKS[analysis];
      if (pos) {
        check(pos[0], pos[1]);
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
