import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import { formatXLabel, makeFormatter } from "../visualizations/definition";
import type { ChartData } from "../visualizations/definition";
import type { RenderedChart, RenderedReport, RenderedSection } from "./sections";

/**
 * Renders a report to PDF on the server with pdf-lib: text and charts are drawn as vectors (no browser needed).
 * Uses the standard PDF fonts, which cover Western European characters; others are replaced.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT_W = A4.width - MARGIN * 2;
const FOOTER_H = 40;

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  ink: hex("#16191D"),
  soft: hex("#3A4048"),
  muted: hex("#5E6873"),
  faint: hex("#8A939C"),
  line: hex("#E1E5E1"),
  paper: hex("#F4F6F4"),
  night: hex("#12181B"),
  petrol: hex("#12656A"),
  white: rgb(1, 1, 1),
};
const SERIES = ["#12656A", "#C98A1B", "#4D6A9C", "#6F9A7B", "#B5452F", "#8A939C", "#5FB3B6", "#8C5E0F"].map(hex);

const REPLACEMENTS: Record<string, string> = { "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2026": "...", "\u2022": "-", "\u00A0": " ", "\u2153": "1/3", "\u00BD": "1/2", "\u2154": "2/3", "\u2192": "->" };

class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  private supported = new Map<string, boolean>();
  constructor(readonly doc: PDFDocument, readonly regular: PDFFont, readonly bold: PDFFont) {}

  clean(text: string) {
    let out = "";
    for (const ch of text.replace(/\r/g, "")) {
      const mapped = REPLACEMENTS[ch] ?? ch;
      for (const c of mapped) {
        if (c === "\n") {
          out += c;
          continue;
        }
        let ok = this.supported.get(c);
        if (ok === undefined) {
          try {
            this.regular.encodeText(c);
            ok = true;
          } catch {
            ok = false;
          }
          this.supported.set(c, ok);
        }
        out += ok ? c : "?";
      }
    }
    return out;
  }

  addPage() {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.pages.push(this.page);
    this.y = A4.height - MARGIN;
  }

  /** Starts a new page when fewer than `height` points remain above the footer. */
  ensure(height: number) {
    if (this.y - height < MARGIN + FOOTER_H) this.addPage();
  }

  text(value: string, x: number, y: number, size: number, options: { font?: PDFFont; color?: RGB; maxWidth?: number } = {}) {
    const font = options.font ?? this.regular;
    let t = this.clean(value);
    if (options.maxWidth && font.widthOfTextAtSize(t, size) > options.maxWidth) {
      while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > options.maxWidth) t = t.slice(0, -1);
      t = `${t.trimEnd()}...`;
    }
    this.page.drawText(t, { x, y, size, font, color: options.color ?? C.ink });
  }

  wrap(value: string, size: number, width: number, font = this.regular) {
    const lines: string[] = [];
    for (const paragraph of this.clean(value).split("\n")) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else {
          if (line) lines.push(line);
          line = word;
          while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        }
      }
      lines.push(line);
    }
    return lines;
  }

  paragraph(value: string, size = 10.5, color = C.soft, font = this.regular, lineHeight = 1.5) {
    for (const line of this.wrap(value, size, CONTENT_W, font)) {
      this.ensure(size * lineHeight);
      this.y -= size * lineHeight;
      if (line) this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color });
    }
  }

  heading(value: string) {
    this.ensure(60);
    this.y -= 22;
    this.text(value, MARGIN, this.y, 17, { font: this.bold });
    this.y -= 8;
  }
}

function formatValue(data: ChartData, v: number) {
  return makeFormatter(data.valueFormat)(v, true);
}

function seriesRows(data: ChartData) {
  const labels: string[] = [];
  const series: string[] = [];
  const values = new Map<string, number>();
  const ordered = data.xType === "date" ? [...data.points].sort((a, b) => String(a.x).localeCompare(String(b.x))) : data.points;
  for (const p of ordered) {
    const label = formatXLabel(p.x, data.xType, data.grain);
    const name = p.s === null ? data.measureLabel : p.s === "true" ? "Yes" : p.s === "false" ? "No" : p.s;
    if (!labels.includes(label)) labels.push(label);
    if (!series.includes(name)) series.push(name);
    values.set(`${label}\u0000${name}`, (values.get(`${label}\u0000${name}`) ?? 0) + (p.v ?? 0));
  }
  if (data.xType !== "date" && !(data.xType === "integer" || data.xType === "decimal")) {
    const total = (l: string) => series.reduce((s, n) => s + (values.get(`${l}\u0000${n}`) ?? 0), 0);
    labels.sort((a, b) => total(b) - total(a));
  }
  return { labels, series, get: (l: string, s: string) => values.get(`${l}\u0000${s}`) ?? 0 };
}

function legend(w: Writer, names: string[], x: number, y: number) {
  let cx = x;
  names.slice(0, 8).forEach((name, i) => {
    const width = Math.min(140, w.regular.widthOfTextAtSize(w.clean(name), 8) + 18);
    if (cx + width > MARGIN + CONTENT_W) return;
    w.page.drawRectangle({ x: cx, y: y - 1, width: 7, height: 7, color: SERIES[i % SERIES.length] });
    w.text(name, cx + 10, y, 8, { color: C.muted, maxWidth: 120 });
    cx += width;
  });
}

function drawBars(w: Writer, data: ChartData, top: number) {
  const { labels, series, get } = seriesRows(data);
  const shown = labels.slice(0, 16);
  const labelW = Math.min(150, Math.max(...shown.map((l) => w.regular.widthOfTextAtSize(w.clean(l), 8))) + 8);
  const barArea = CONTENT_W - labelW - 60;
  const max = Math.max(...shown.map((l) => series.reduce((s, n) => s + Math.max(0, get(l, n)), 0)), 1e-9);
  const rowH = 22;
  let y = top - (series.length > 1 ? 18 : 0);
  if (series.length > 1) legend(w, series, MARGIN, top - 8);
  for (const label of shown) {
    y -= rowH;
    w.text(label, MARGIN, y + rowH * 0.3, 8, { color: C.soft, maxWidth: labelW - 8 });
    let x = MARGIN + labelW;
    let total = 0;
    series.forEach((name, i) => {
      const v = Math.max(0, get(label, name));
      total += get(label, name);
      const width = (v / max) * barArea;
      if (width > 0) w.page.drawRectangle({ x, y: y + rowH * 0.18, width, height: rowH * 0.64, color: SERIES[i % SERIES.length] });
      x += width;
    });
    w.text(formatValue(data, total), x + 4, y + rowH * 0.3, 8, { font: w.bold, color: C.soft });
  }
  if (labels.length > shown.length) w.text(`Top ${shown.length} of ${labels.length} shown`, MARGIN, y - 12, 7.5, { color: C.faint });
}

function drawLines(w: Writer, data: ChartData, top: number, height: number, area: boolean) {
  const { labels, series, get } = seriesRows(data);
  if (labels.length === 0) return;
  const left = MARGIN + 52;
  const right = MARGIN + CONTENT_W - 8;
  const bottom = top - height + 22;
  const plotTop = top - (series.length > 1 ? 22 : 8);
  const all = labels.flatMap((l) => series.map((s) => get(l, s)));
  const min = Math.min(0, ...all);
  const max = Math.max(...all, min + 1e-9);
  const yOf = (v: number) => bottom + ((v - min) / (max - min)) * (plotTop - bottom);
  const xOf = (i: number) => (labels.length === 1 ? (left + right) / 2 : left + (i / (labels.length - 1)) * (right - left));
  for (let g = 0; g <= 4; g++) {
    const v = min + ((max - min) * g) / 4;
    const gy = yOf(v);
    w.page.drawLine({ start: { x: left, y: gy }, end: { x: right, y: gy }, thickness: 0.5, color: C.line });
    w.text(formatValue(data, v), MARGIN, gy - 3, 7, { color: C.faint, maxWidth: 48 });
  }
  if (series.length > 1) legend(w, series, left, top - 8);
  series.forEach((name, si) => {
    const color = SERIES[si % SERIES.length];
    const pts = labels.map((l, i) => ({ x: xOf(i), y: yOf(get(l, name)) }));
    if (area && series.length === 1 && pts.length > 1) {
      const path = `M ${pts[0].x} ${A4.height - yOf(Math.max(min, 0))} ` + pts.map((p) => `L ${p.x} ${A4.height - p.y}`).join(" ") + ` L ${pts[pts.length - 1].x} ${A4.height - yOf(Math.max(min, 0))} Z`;
      w.page.drawSvgPath(path, { x: 0, y: A4.height, color, opacity: 0.15, borderWidth: 0 });
    }
    for (let i = 1; i < pts.length; i++) w.page.drawLine({ start: pts[i - 1], end: pts[i], thickness: 1.6, color });
    if (pts.length <= 40) pts.forEach((p) => w.page.drawCircle({ x: p.x, y: p.y, size: 1.8, color }));
  });
  const ticks = labels.length <= 6 ? labels.map((_, i) => i) : [0, Math.floor((labels.length - 1) / 2), labels.length - 1];
  ticks.forEach((i) => {
    const label = w.clean(labels[i]);
    const width = w.regular.widthOfTextAtSize(label, 7);
    w.text(label, Math.min(Math.max(xOf(i) - width / 2, left), right - width), bottom - 12, 7, { color: C.muted });
  });
}

function drawDonut(w: Writer, data: ChartData, top: number, height: number) {
  const { labels, series, get } = seriesRows(data);
  const values = labels.map((l) => Math.max(0, series.reduce((s, n) => s + get(l, n), 0)));
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = Math.min(80, height / 2 - 10);
  const cx = MARGIN + r + 10;
  const cy = top - height / 2;
  let angle = -Math.PI / 2;
  values.slice(0, 8).forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    if (sweep <= 0) return;
    const end = angle + Math.min(sweep, Math.PI * 2 - 1e-4);
    const large = sweep > Math.PI ? 1 : 0;
    const p = (a: number, rad: number) => `${cx + rad * Math.cos(a)} ${A4.height - (cy + rad * Math.sin(-a))}`;
    const inner = r * 0.58;
    // Clockwise on screen (SVG y points down): outer arc sweep 1, inner arc back with sweep 0.
    const path = `M ${p(angle, r)} A ${r} ${r} 0 ${large} 1 ${p(end, r)} L ${p(end, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(angle, inner)} Z`;
    w.page.drawSvgPath(path, { x: 0, y: A4.height, color: SERIES[i % SERIES.length], borderWidth: 0 });
    angle = end;
  });
  let ly = top - 18;
  labels.slice(0, 8).forEach((label, i) => {
    w.page.drawRectangle({ x: cx + r + 30, y: ly - 1, width: 8, height: 8, color: SERIES[i % SERIES.length] });
    w.text(label, cx + r + 44, ly, 9, { color: C.soft, maxWidth: 170 });
    w.text(`${formatValue(data, values[i])}  (${((values[i] / total) * 100).toFixed(1)}%)`, cx + r + 220, ly, 9, { font: w.bold, color: C.ink });
    ly -= 18;
  });
}

function drawTable(w: Writer, data: ChartData, top: number, maxRows: number) {
  const { labels, series, get } = seriesRows(data);
  let y = top - 14;
  const colW = Math.min(110, (CONTENT_W - 160) / Math.max(series.length, 1));
  w.text("", MARGIN, y, 8);
  series.slice(0, 4).forEach((s, i) => w.text(s, MARGIN + 160 + i * colW, y, 8, { font: w.bold, color: C.muted, maxWidth: colW - 6 }));
  y -= 6;
  w.page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.6, color: C.line });
  for (const label of labels.slice(0, maxRows)) {
    y -= 15;
    w.text(label, MARGIN, y, 8.5, { color: C.soft, maxWidth: 150 });
    series.slice(0, 4).forEach((s, i) => w.text(formatValue(data, get(label, s)), MARGIN + 160 + i * colW, y, 8.5, { color: C.ink }));
  }
}

/** Space a chart needs, so its heading can be kept on the same page. */
function chartHeight(w: Writer, chart: RenderedChart) {
  if (chart.data.matched === 0) return 40;
  if (chart.kind === "kpi") return 70;
  const { labels, series } = seriesRows(chart.data);
  if (chart.kind === "table" || chart.kind === "heatmap") return 30 + 15 * Math.min(16, labels.length);
  if (chart.kind === "bar") return Math.min(16, labels.length) * 22 + (series.length > 1 ? 22 : 0) + (labels.length > 16 ? 16 : 4);
  return 220;
}

function drawChart(w: Writer, chart: RenderedChart) {
  const height = chartHeight(w, chart);
  w.ensure(height + 40);
  w.y -= 18;
  w.text(chart.title, MARGIN, w.y, 11, { font: w.bold, maxWidth: CONTENT_W });
  if (chart.datasetName) {
    w.y -= 13;
    w.text(`${chart.data.measureLabel} · ${chart.datasetName} · ${chart.data.matched.toLocaleString("en-US")} rows`, MARGIN, w.y, 8, { color: C.faint, maxWidth: CONTENT_W });
  }
  const top = w.y - 8;
  if (chart.data.matched === 0) {
    w.text("No rows match this chart's filters.", MARGIN, top - 20, 9, { color: C.muted });
  } else if (chart.kind === "kpi") {
    w.text(chart.data.total === null ? "-" : makeFormatter(chart.data.valueFormat)(chart.data.total, false), MARGIN, top - 44, 30, { font: w.bold });
  } else if (chart.kind === "line" || chart.kind === "area") {
    drawLines(w, chart.data, top, height, chart.kind === "area");
  } else if (chart.kind === "donut") {
    drawDonut(w, chart.data, top, height);
  } else if (chart.kind === "table" || chart.kind === "heatmap") {
    drawTable(w, chart.data, top, 16);
  } else if (chart.kind === "scatter") {
    drawLines(w, { ...chart.data }, top, height, false);
  } else {
    drawBars(w, chart.data, top);
  }
  w.y = top - height - 6;
}

function drawSection(w: Writer, section: RenderedSection, report: RenderedReport) {
  switch (section.type) {
    case "cover":
      return;
    case "text":
      if (section.heading) w.heading(section.heading);
      if (section.body) w.paragraph(section.body);
      w.y -= 10;
      return;
    case "list":
      if (section.heading) w.heading(section.heading);
      for (const item of section.items) {
        const lines = w.wrap(item, 10.5, CONTENT_W - 16);
        w.ensure(16 * lines.length);
        lines.forEach((line, i) => {
          w.y -= 16;
          if (i === 0) w.page.drawCircle({ x: MARGIN + 3, y: w.y + 3.5, size: 2, color: C.petrol });
          w.page.drawText(line, { x: MARGIN + 14, y: w.y, size: 10.5, font: w.regular, color: C.soft });
        });
        w.y -= 4;
      }
      w.y -= 6;
      return;
    case "kpis": {
      if (section.heading) {
        w.ensure(130);
        w.heading(section.heading);
      }
      const cols = Math.min(Math.max(section.items.length, 1), 4);
      const gap = 10;
      const boxW = (CONTENT_W - gap * (cols - 1)) / cols;
      w.ensure(86);
      const top = w.y - 8;
      section.items.forEach((item, i) => {
        const x = MARGIN + i * (boxW + gap);
        w.page.drawRectangle({ x, y: top - 74, width: boxW, height: 74, borderColor: C.line, borderWidth: 0.8, color: C.white });
        w.text(item.label, x + 10, top - 18, 8.5, { color: C.muted, maxWidth: boxW - 20 });
        w.text(item.value ?? "-", x + 10, top - 44, cols > 3 ? 16 : 19, { font: w.bold, maxWidth: boxW - 20 });
        w.text(item.error ?? item.detail, x + 10, top - 62, 7, { color: C.faint, maxWidth: boxW - 20 });
      });
      w.y = top - 84;
      return;
    }
    case "chart":
      // Keep the heading with its chart.
      if (section.heading) {
        w.ensure(40 + (section.chart ? chartHeight(w, section.chart) + 40 : 30));
        w.heading(section.heading);
      }
      if (section.chart) drawChart(w, section.chart);
      else {
        w.ensure(30);
        w.y -= 18;
        w.text(section.error ?? "This chart isn't available.", MARGIN, w.y, 9.5, { color: C.muted });
      }
      if (section.commentary) {
        w.y -= 4;
        w.paragraph(section.commentary, 10, C.soft);
      }
      w.y -= 12;
      return;
    case "appendix":
      w.ensure(140);
      if (section.heading) w.heading(section.heading);
      if (section.body) w.paragraph(section.body, 9.5, C.soft);
      if (section.sources.length) {
        w.y -= 6;
        w.paragraph("Data sources", 9.5, C.ink, w.bold);
        section.sources.forEach((s) => w.paragraph(`${s.name}: up to ${s.rows.toLocaleString("en-US")} rows used`, 9, C.muted));
      }
      w.paragraph(`Generated ${new Date(report.generatedAt).toUTCString().replace(" GMT", " UTC")}.`, 8.5, C.faint);
      return;
  }
}

export async function renderReportPdf(report: RenderedReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(report.name);
  doc.setAuthor(report.preparedBy);
  doc.setCreator("Visuioration");
  doc.setProducer("Visuioration");
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  const cover = report.sections.find((s): s is Extract<RenderedSection, { type: "cover" }> => s.type === "cover");
  if (cover) {
    w.addPage();
    w.page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: C.night });
    w.text(report.workspaceName, MARGIN, A4.height - MARGIN - 10, 10, { color: hex("#9AA6AB") });
    const titleLines = w.wrap(report.name, 34, CONTENT_W, w.bold);
    let y = A4.height * 0.52;
    titleLines.forEach((line) => {
      w.page.drawText(line, { x: MARGIN, y, size: 34, font: w.bold, color: C.white });
      y -= 40;
    });
    if (report.period) w.text(report.period, MARGIN, y - 4, 15, { color: hex("#C9D3D6") });
    const sub = cover.subtitle || report.description;
    if (sub) w.wrap(sub, 11, CONTENT_W).slice(0, 4).forEach((line, i) => w.text(line, MARGIN, y - 34 - i * 16, 11, { color: hex("#9AA6AB") }));
    w.text(`Prepared by ${report.preparedBy}`, MARGIN, MARGIN + 30, 10, { color: hex("#9AA6AB") });
  }
  w.addPage();
  if (!cover) {
    w.y -= 10;
    w.text(report.name, MARGIN, w.y, 22, { font: w.bold, maxWidth: CONTENT_W });
    if (report.period) {
      w.y -= 18;
      w.text(report.period, MARGIN, w.y, 11, { color: C.muted });
    }
    w.y -= 10;
  }
  for (const section of report.sections) drawSection(w, section, report);

  // Footers once the page count is known.
  w.pages.forEach((page, i) => {
    const dark = Boolean(cover) && i === 0;
    page.drawLine({ start: { x: MARGIN, y: MARGIN - 4 }, end: { x: A4.width - MARGIN, y: MARGIN - 4 }, thickness: 0.5, color: dark ? hex("#2E3B41") : C.line });
    page.drawText(w.clean(`Prepared by Visuioration · ${report.workspaceName}`), { x: MARGIN, y: MARGIN - 18, size: 7.5, font: w.regular, color: dark ? hex("#6F7C82") : C.faint });
    const label = `Page ${i + 1} of ${w.pages.length}`;
    page.drawText(label, { x: A4.width - MARGIN - w.regular.widthOfTextAtSize(label, 7.5), y: MARGIN - 18, size: 7.5, font: w.regular, color: dark ? hex("#6F7C82") : C.faint });
  });
  return doc.save();
}
