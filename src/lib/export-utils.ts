import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel<T extends Record<string, unknown>>(rows: T[], filename: string, sheetName = "Données") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

export function exportToPDF(opts: {
  title: string;
  filename: string;
  columns: { header: string; dataKey: string }[];
  rows: Record<string, unknown>[];
  subtitle?: string;
}) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(opts.title, 14, 18);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, 14, 25);
  }
  autoTable(doc, {
    startY: opts.subtitle ? 30 : 24,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => String(r[c.dataKey] ?? ""))),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });
  doc.save(`${opts.filename}.pdf`);
}

export function generateReceiptPDF(p: {
  recu_numero: string;
  date: string;
  eleve_nom: string;
  eleve_matricule: string;
  classe?: string;
  montant: number;
  motif?: string;
  devise?: string;
  etablissement?: string;
  type_paiement?: string;
}) {
  const devise = p.devise ?? "Ar";
  const doc = new jsPDF();
  if (p.etablissement) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(p.etablissement, 14, 14);
    doc.setTextColor(0);
  }
  doc.setFontSize(20);
  doc.text("REÇU DE PAIEMENT", 105, 25, { align: "center" });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`N° ${p.recu_numero}`, 14, 42);
  doc.text(`Date : ${p.date}`, 196, 42, { align: "right" });

  doc.setTextColor(20);
  doc.setFontSize(12);
  let y = 60;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, y);
    y += 9;
  };
  line("Élève :", p.eleve_nom);
  line("Matricule :", p.eleve_matricule);
  if (p.classe) line("Classe :", p.classe);
  if (p.type_paiement) line("Type :", p.type_paiement);
  if (p.motif) line("Motif :", p.motif);

  y += 6;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 12;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Montant payé :", 14, y);
  doc.setTextColor(37, 99, 235);
  doc.text(`${p.montant.toLocaleString("fr-FR")} ${devise}`, 196, y, { align: "right" });

  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Merci pour votre paiement. Ce reçu fait foi de règlement.", 105, 280, { align: "center" });

  doc.save(`recu-${p.recu_numero}.pdf`);
}

