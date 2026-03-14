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

const PH = 841.89;
function Y(topY: number): number { return PH - topY; }

const FS = 8;
const FS_SMALL = 6.5;

// ---- TUBE BLEU ----
const TUBE_BLEU_CHECKS: Record<string, [number, number]> = {
  "INR":                           [14,  349],
  "TCA":                           [62,  349],
  "Fibrine":                       [112, 349],
  "TP":                            [155, 349],
  "AT3":                           [210, 349],
  "Plaquettes sur tube citrate":   [378, 349],
  "Ddimeres":                      [505, 349],
};

// ---- TUBE JAUNE 5mL ----
const COL1_X = 15;
const COL2_X = 172;
const COL3_X = 298;
const COL4_X = 464;
const JAUNE_START_Y = 405;
const JAUNE_ROW_H = 9.3;
function jauneY(row: number): number { return JAUNE_START_Y + row * JAUNE_ROW_H; }

const TUBE_JAUNE_CHECKS: Record<string, [number, number]> = {
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

const CARDIAQUES_CHECKS: Record<string, [number, number]> = {
  "NTproBNP":                     [18,  590],
  "Troponine":                    [88,  590],
  "Electrophorese des protides / Immunotypage": [20, 608],
};

const RHUMATO_CHECKS: Record<string, [number, number]> = {
  "ENA / AAN / ACADN":            [18,  635],
  "Facteurs rhumatoides":         [160, 635],
};

const SEROLOGIES_CHECKS: Record<string, [number, number]> = {
  "Serologie H.Pylori":           [22,  675],
  "Serologie C.trachomatis IgG":  [22,  675],
  "Procalcitonie":                [320, 675],
};

const CHLORDECONE_CHECKS: Record<string, [number, number]> = {
  "Chlordecone":                  [20, 692],
};

const VERT_CHECKS: Record<string, [number, number]> = {
  "Bicarbonates / Reserve alcaline": [465, 692],
};

const VIOLET_CHECKS: Record<string, [number, number]> = {
  "NFS":                          [18,  730],
  "VS":                           [58,  730],
  "Reticulocytes":                [103, 730],
  "BNP":                          [218, 730],
  "HbA1C":                        [398, 730],
  "Plaquettes":                   [18,  742],
  "Electrophorese HB":            [20,  755],
  "RAI":                          [18,  787],
  "Groupe sanguin":               [185, 787],
};

const GRIS_CHECKS: Record<string, [number, number]> = {
  "Glycemie a Jeun":              [490, 730],
  "GPP":                          [490, 742],
};

const ANTICOAGULANT_CHECKS: Record<string, [number, number]> = {
  "Sintrom":     [82,  365],
  "Previscan":   [140, 365],
  "Coumadine":   [210, 365],
  "Fraxi":       [290, 365],
  "Lovenox":     [342, 365],
  "Innohep":     [405, 365],
  "Calciparine": [468, 365],
  "Orgaran":     [540, 365],
  "Rivaroxaban": [365, 377],
  "Apixaban":    [438, 377],
  "Dabigatran":  [510, 377],
};

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
  const formUrl = new URL("/fiche-labo-vierge.pdf", window.location.origin).href;
  const formBytes = await fetch(formUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(formBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];
  const black = rgb(0, 0, 0);

  function text(str: string, x: number, topY: number, size = FS, bold = false) {
    if (!str) return;
    page.drawText(str, { x, y: Y(topY), size, font: bold ? fontBold : font, color: black });
  }

  function check(x: number, topY: number) {
    page.drawText("X", { x: x + 1, y: Y(topY) - 1, size: 8, font: fontBold, color: black });
  }

  // Header
  text(data.medecinTraitant, 290, 102, FS);
  text(data.medecinTraitant, 530, 97, FS);
  if (data.urgent) { check(492, 102); }

  // IDE
  text(data.ideName, 35, 167, FS);
  text(data.ideCabinet, 55, 180, FS);
  text(data.datePrelevement, 120, 195, FS);
  text(data.heurePrelevement, 130, 220, FS);

  // Patient
  text(data.nomUsuel.toUpperCase(), 340, 168, FS, true);
  text(data.nomUsuel.toUpperCase(), 510, 163, FS);
  text(data.prenoms, 330, 180, FS);
  if (data.sexe === "M") { check(505, 170); }
  else if (data.sexe === "F") { check(528, 170); }
  text(data.telephone, 490, 188, FS);
  if (data.dateNaissance) {
    const dn = data.dateNaissance;
    let formatted = dn;
    if (dn.includes("-")) {
      const parts = dn.split("-");
      if (parts.length === 3) { formatted = `${parts[2]}/${parts[1]}/${parts[0]}`; }
    }
    text(formatted, 325, 195, FS);
  }
  text(data.adresse, 330, 210, FS_SMALL);
  text(data.numSecu, 310, 222, FS);

  // Clinical
  if (data.grossesse) { check(250, 263); }
  if (data.fievre) { check(345, 263); }
  if (data.traitements) { text(data.traitements, 130, 270, FS_SMALL); }

  // Anticoagulant
  if (data.anticoagulant && data.anticoagulant !== "none" && data.anticoagulant !== "") {
    const pos = ANTICOAGULANT_CHECKS[data.anticoagulant];
    if (pos) { check(pos[0], pos[1]); }
    if (data.posologie) { text(data.posologie, 200, 377, FS); }
    if (data.inrCible) {
      if (data.inrCible === "2-3") { check(432, 377); }
      else if (data.inrCible === "3-4.5" || data.inrCible === "3-4,5") { check(492, 377); }
      else { text(data.inrCible, 492, 379, FS); }
    }
  }

  // Analyses
  for (const section of data.analysesBySection) {
    for (const analysis of section.analyses) {
      const pos = ALL_CHECKS[analysis];
      if (pos) { check(pos[0], pos[1]); }
    }
  }

  // Save and download
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
