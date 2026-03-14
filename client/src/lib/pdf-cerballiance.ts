import jsPDF from "jspdf";

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
  // Analyses grouped by tube
  analysesBySection: { label: string; color: string; analyses: string[] }[];
}

// Colors for tube sections
const TUBE_COLORS: Record<string, [number, number, number]> = {
  "Tube bleu (citrate)": [59, 130, 246],
  "Tube jaune 5mL": [234, 179, 8],
  "Tube jaune 3.5mL (rhumato)": [245, 158, 11],
  "Serologies": [168, 85, 247],
  "Analyses cardiaques": [239, 68, 68],
  "Tube violet EDTA": [139, 92, 246],
  "Tube gris": [107, 114, 128],
  "Tube vert": [34, 197, 94],
  "Tube rouge (Chlordecone)": [220, 38, 38],
};

export function generateCerballiancePDF(data: CerballiancePDFData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  let y = 10;

  // ---- Header ----
  doc.setFillColor(99, 102, 241); // Indigo
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CERBALLIANCE", marginL, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fiche de Prelevement Sanguin", marginL, 19);

  // Urgent badge
  if (data.urgent) {
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(pageW - marginR - 30, 6, 28, 10, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("URGENT", pageW - marginR - 16, 13, { align: "center" });
  }

  // Date + heure
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${data.datePrelevement}  Heure: ${data.heurePrelevement}`, pageW - marginR, 24, { align: "right" });

  y = 33;
  doc.setTextColor(0, 0, 0);

  // ---- Section helper ----
  function sectionHeader(title: string, yPos: number): number {
    doc.setFillColor(243, 244, 246);
    doc.rect(marginL, yPos, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text(title, marginL + 2, yPos + 5);
    doc.setTextColor(0, 0, 0);
    return yPos + 9;
  }

  function labelValue(label: string, value: string, x: number, yPos: number, maxW = 80): number {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(label, x, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(value || "---", maxW);
    doc.text(lines, x, yPos + 4);
    return yPos + 4 + lines.length * 3.5;
  }

  // ---- IDE (Preleveur) ----
  y = sectionHeader("PRELEVEUR (IDE)", y);
  const ideCol1 = marginL + 2;
  const ideCol2 = marginL + contentW / 2;
  labelValue("Nom", data.ideName, ideCol1, y);
  labelValue("Cabinet", data.ideCabinet, ideCol2, y);
  y += 10;
  labelValue("Telephone", data.idePhone, ideCol1, y);
  labelValue("RPPS", data.ideRpps, ideCol2, y);
  y += 10;
  labelValue("ADELI", data.ideAdeli, ideCol1, y);
  y += 8;

  // ---- Patient ----
  y = sectionHeader("IDENTITE DU PATIENT", y);
  const pCol1 = marginL + 2;
  const pCol2 = marginL + contentW / 2;
  labelValue("Nom usuel", data.nomUsuel.toUpperCase(), pCol1, y, contentW / 2 - 5);
  labelValue("Prenom(s)", data.prenoms, pCol2, y, contentW / 2 - 5);
  y += 10;
  labelValue("Date de naissance", data.dateNaissance, pCol1, y);
  labelValue("Sexe", data.sexe === "M" ? "Homme" : data.sexe === "F" ? "Femme" : "---", pCol2, y);
  y += 10;
  labelValue("Adresse", data.adresse, pCol1, y, contentW - 5);
  y += 10;
  labelValue("Telephone", data.telephone, pCol1, y);
  labelValue("N. Securite Sociale", data.numSecu, pCol2, y);
  y += 10;
  labelValue("Medecin traitant / Prescripteur", data.medecinTraitant, pCol1, y, contentW - 5);
  y += 10;

  // ---- Renseignements cliniques ----
  y = sectionHeader("RENSEIGNEMENTS CLINIQUES", y);
  const clinicalItems: string[] = [];
  if (data.grossesse) clinicalItems.push("Grossesse");
  if (data.fievre) clinicalItems.push("Fievre");
  if (data.traitements) clinicalItems.push(`Traitements: ${data.traitements}`);
  if (clinicalItems.length === 0) clinicalItems.push("Aucun");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  for (const item of clinicalItems) {
    doc.text(`• ${item}`, marginL + 2, y + 2);
    y += 4;
  }
  y += 2;

  // ---- Anticoagulant ----
  if (data.anticoagulant && data.anticoagulant !== "none" && data.anticoagulant !== "") {
    y = sectionHeader("ANTICOAGULANT", y);
    labelValue("Molecule", data.anticoagulant, marginL + 2, y);
    labelValue("Posologie", data.posologie, marginL + contentW / 3, y);
    labelValue("INR cible", data.inrCible, marginL + (contentW * 2) / 3, y);
    y += 12;
  }

  // ---- Analyses ----
  y = sectionHeader("ANALYSES PRESCRITES", y);
  y += 1;

  for (const section of data.analysesBySection) {
    if (section.analyses.length === 0) continue;

    // Check if we need a new page
    if (y > 265) {
      doc.addPage();
      y = 15;
    }

    const rgb = TUBE_COLORS[section.label] ?? [99, 102, 241];
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(marginL, y, contentW, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${section.label} (${section.analyses.length})`, marginL + 3, y + 4.2);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Analyses in 3 columns
    const cols = 3;
    const colW = contentW / cols;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");

    for (let i = 0; i < section.analyses.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xPos = marginL + 2 + col * colW;
      const yPos = y + row * 4;

      if (yPos > 280) {
        doc.addPage();
        y = 15;
      }

      // Checkbox
      doc.setDrawColor(99, 102, 241);
      doc.setFillColor(99, 102, 241);
      doc.rect(xPos, yPos - 2.5, 2.5, 2.5, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text("✓", xPos + 0.4, yPos - 0.3);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.text(section.analyses[i], xPos + 4, yPos);
    }

    const totalRows = Math.ceil(section.analyses.length / cols);
    y += totalRows * 4 + 3;
  }

  // ---- Footer ----
  if (y > 270) {
    doc.addPage();
    y = 15;
  }
  y = Math.max(y, 260);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageW - marginR, y);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text("OrdoFill — Fiche generee automatiquement", marginL, y + 4);
  doc.text(
    `Genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`,
    pageW - marginR,
    y + 4,
    { align: "right" }
  );

  // ---- Download ----
  const filename = `Cerballiance_${data.nomUsuel.toUpperCase()}_${data.prenoms}_${data.datePrelevement}.pdf`;
  doc.save(filename);
}
