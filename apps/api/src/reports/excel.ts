import ExcelJS from "exceljs";
import type { SessionReportData } from "./reportData.js";
export async function renderXlsx(data: SessionReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const kpi = wb.addWorksheet("KPIs");
  kpi.addRow(["Metric", "Value"]);
  for (const [k, v] of Object.entries(data.kpis)) kpi.addRow([k, v]);
  const comp = wb.addWorksheet("Components");
  comp.addRow(["Component", "Attention %", "Total View ms"]);
  for (const r of data.components) comp.addRow([r.meshName, r.attentionPct, r.totalViewMs]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
