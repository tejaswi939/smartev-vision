import PDFDocument from "pdfkit";
import type { SessionReportData } from "./reportData.js";
export function renderPdf(data: SessionReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(20).text(data.title);
    doc.moveDown().fontSize(12);
    for (const [k, v] of Object.entries(data.kpis)) doc.text(`${k}: ${v}`);
    doc.moveDown().fontSize(14).text("Components by attention");
    doc.fontSize(10);
    for (const r of data.components) doc.text(`${r.meshName} — ${r.attentionPct}% (${r.totalViewMs} ms)`);
    doc.end();
  });
}
