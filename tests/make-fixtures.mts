import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const dir = "tests/fixtures";
writeFileSync(`${dir}/sales.csv`, "\uFEFFOrder ID,Date,Region,Revenue,Units,Discount,Returned,Notes\n" +
  Array.from({ length: 1200 }, (_, i) => `NS-${10000 + i},2026-0${(i % 6) + 1}-${String((i % 27) + 1).padStart(2, "0")},${["North","South","East","West"][i % 4]},"$${(1000 + i * 3.25).toLocaleString("en-US", { minimumFractionDigits: 2 })}",${(i % 9) + 1},${(i % 20)}%,${i % 7 === 0 ? "yes" : "no"},${i % 3 === 0 ? "priority" : ""}`).join("\n") + "\n");
writeFileSync(`${dir}/semicolon.csv`, "name;score;passed\nAna;9,5;true\nBen;7;false\n");
writeFileSync(`${dir}/messy.csv`, ",Amount,Amount,City\n1,10,11,Paris\n2,abc,12,Lyon,EXTRA\n3,,13\n4,40,14,Nice\n5,50,15,Nice\n6,60,,Nice\n7,70,,Nice\n8,80,,\n9,90,,\n10,100,,\n11,110,,\n");
writeFileSync(`${dir}/headers-only.csv`, "a,b,c\n");
writeFileSync(`${dir}/empty.csv`, "\n\n");
writeFileSync(`${dir}/fake.xlsx`, "not really a workbook");

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Q2");
ws.addRow([]);
ws.addRow(["Month", "Region", "Revenue", "Margin", "Target met", "Formula"]);
for (let i = 0; i < 300; i++) {
  const r = ws.addRow([new Date(Date.UTC(2026, i % 12, 1)), ["North", "South"][i % 2], 1000.5 + i, 0.25, i % 2 === 0, null]);
  r.getCell(6).value = { formula: `C${i + 3}*2`, result: (1000.5 + i) * 2 };
}
ws.getCell("B10").value = { richText: [{ text: "Rich " }, { text: "South" }] };
wb.addWorksheet("Ignored").addRow(["x"]);
await wb.xlsx.writeFile(`${dir}/workbook.xlsx`);
console.log("fixtures written");
