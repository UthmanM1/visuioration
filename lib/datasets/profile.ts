import { Readable } from "node:stream";
import type { ColumnDataType } from "../supabase/database.types";

/**
 * Server-only (uses Node streams). Streaming dataset profiler. Rows are fed one at a time, so memory stays flat regardless of file size.
 * Used on the server after upload; has no server-only dependencies so it can be unit tested directly.
 */

export type Cell = string | number | boolean | Date | null | undefined;
export type PreviewCell = string | number | boolean | null;

export interface ColumnProfile {
  position: number;
  name: string;
  dataType: ColumnDataType;
  nullCount: number;
  distinctCount: number;
  distinctCapped: boolean;
  min: string | null;
  max: string | null;
  samples: string[];
}

export interface DatasetIssue {
  code: "empty_header" | "duplicate_header" | "ragged_rows" | "mostly_empty" | "mixed_types" | "no_rows" | "truncated_header" | "long_values" | "row_limit";
  message: string;
  column?: string;
}

export interface DatasetProfile {
  rowCount: number;
  columns: ColumnProfile[];
  preview: PreviewCell[][];
  issues: DatasetIssue[];
}

export class DatasetParseError extends Error {}

const NULL_TOKENS = new Set(["", "null", "n/a", "na", "nan", "none", "-", "—"]);
const BOOL_TOKENS = new Set(["true", "false", "yes", "no"]);
const NUMBER = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+`;
const INTEGER_RE = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d{1,15})$/;
const DECIMAL_RE = new RegExp(`^[+-]?(?:${NUMBER})(?:[eE][+-]?\\d+)?$`);
const CURRENCY_RE = new RegExp(`^(?:[+-]?[$€£¥]\\s?(?:${NUMBER})|[$€£¥]\\s?-(?:${NUMBER})|[+-]?(?:${NUMBER})\\s?[$€£¥]|\\((?:[$€£¥]\\s?)?(?:${NUMBER})\\))$`);
const PERCENT_RE = new RegExp(`^[+-]?(?:${NUMBER})\\s?%$`);
const DATE_RES = [
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
  /^\d{4}\/\d{1,2}\/\d{1,2}$/,
  /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/,
  /^\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{4}$/,
  /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/,
];

/** Types a single non-null value could be. Order matters: the first type every value supports wins. */
const CANDIDATES: ColumnDataType[] = ["boolean", "integer", "decimal", "percent", "currency", "date"];
const TYPE_THRESHOLD = 0.95;

function isNullish(value: Cell) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return NULL_TOKENS.has(value.trim().toLowerCase());
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

function parseLooseNumber(text: string): number {
  const negative = /^\(.*\)$/.test(text) || /^-|^[$€£¥]\s?-/.test(text);
  const digits = text.replace(/[^0-9.eE+-]/g, "").replace(/^[+-]/, "");
  const n = Number(digits);
  return negative ? -Math.abs(n) : n;
}

function looksLikeDate(text: string) {
  if (!DATE_RES.some((re) => re.test(text))) return false;
  const iso = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(text) ? text.replace(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/, "$3-$2-$1") : text;
  return !Number.isNaN(Date.parse(iso)) || !Number.isNaN(Date.parse(text));
}

/** Which candidate types this value satisfies. */
function matches(value: Exclude<Cell, null | undefined>): Set<ColumnDataType> {
  const out = new Set<ColumnDataType>();
  if (typeof value === "boolean") return out.add("boolean");
  if (value instanceof Date) return out.add("date");
  if (typeof value === "number") {
    if (Number.isInteger(value)) out.add("integer");
    out.add("decimal").add("currency").add("percent");
    return out;
  }
  const text = value.trim();
  const lower = text.toLowerCase();
  if (BOOL_TOKENS.has(lower)) out.add("boolean");
  if (INTEGER_RE.test(text)) out.add("integer");
  if (DECIMAL_RE.test(text)) out.add("decimal").add("currency").add("percent");
  if (CURRENCY_RE.test(text)) out.add("currency");
  if (PERCENT_RE.test(text)) out.add("percent");
  if (looksLikeDate(text)) out.add("date");
  return out;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

function validYmd(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
}

/**
 * Converts a date-like value to ISO "YYYY-MM-DD" (or "YYYY-MM-DDTHH:MM:SS" when it has a time).
 * For d/m/y vs m/d/y, a first part above 12 means day-first; otherwise month-first is assumed.
 */
export function toIsoDate(value: Exclude<Cell, null | undefined>): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const iso = value.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 19);
  }
  const text = String(value).trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const day = validYmd(+m[1], +m[2], +m[3]);
    if (!day) return null;
    return m[4] && !(m[4] === "00" && m[5] === "00" && (!m[6] || m[6] === "00")) ? `${day}T${m[4]}:${m[5]}:${m[6] ?? "00"}` : day;
  }
  if ((m = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) return validYmd(+m[1], +m[2], +m[3]);
  if ((m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    const a = +m[1], b = +m[2], y = +m[3];
    return a > 12 ? validYmd(y, b, a) : validYmd(y, a, b) ?? validYmd(y, b, a);
  }
  if ((m = text.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})$/))) return MONTHS[m[2].toLowerCase()] ? validYmd(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) : null;
  if ((m = text.match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/))) return MONTHS[m[1].toLowerCase()] ? validYmd(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) : null;
  return null;
}

export type NormalizedCell = string | number | boolean | null;

/** Converts a raw cell to its column's type. Values that don't fit the type become null. */
export function normalizeCell(cell: Cell, type: ColumnDataType): NormalizedCell {
  if (isNullish(cell)) return null;
  const value = cell as Exclude<Cell, null | undefined>;
  switch (type) {
    case "boolean": {
      if (typeof value === "boolean") return value;
      const lower = String(value).trim().toLowerCase();
      return lower === "true" || lower === "yes" ? true : lower === "false" || lower === "no" ? false : null;
    }
    case "integer":
    case "decimal":
    case "currency":
    case "percent": {
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      const text = String(value).trim();
      if (!(DECIMAL_RE.test(text) || CURRENCY_RE.test(text) || PERCENT_RE.test(text) || INTEGER_RE.test(text))) return null;
      const n = parseLooseNumber(text);
      return Number.isFinite(n) ? n : null;
    }
    case "date":
      return toIsoDate(value);
    default:
      return displayValue(value).slice(0, FILE_LIMITS.maxCellChars);
  }
}

function displayValue(value: Exclude<Cell, null | undefined>): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().replace("T00:00:00.000Z", "");
  return String(value).trim();
}

interface ColumnState {
  name: string;
  nulls: number;
  nonNull: number;
  typeHits: Record<ColumnDataType, number>;
  explicitSymbol: { currency: number; percent: number };
  distinct: Set<string>;
  distinctCapped: boolean;
  samples: string[];
  numericMin: number;
  numericMax: number;
  dateMin: string | null;
  dateMax: string | null;
}

/** Hard limits for uploaded files (the 50 MB size limit is enforced separately). */
export const FILE_LIMITS = { maxColumns: 500, maxRows: 2_000_000, maxCellChars: 2000 };

export interface ProfilerOptions {
  previewRows?: number;
  maxDistinct?: number;
  /** CSV rows should match the header width; spreadsheet rows legitimately stop at the last filled cell. */
  strictWidth?: boolean;
  /** Overrides FILE_LIMITS.maxRows (tests). */
  maxRows?: number;
}

export function normalizeHeaders(raw: Cell[]): { headers: string[]; issues: DatasetIssue[] } {
  const issues: DatasetIssue[] = [];
  const seen = new Map<string, number>();
  let empty = 0;
  let truncated = false;
  const headers = raw.map((cell, i) => {
    let name = isNullish(cell) ? "" : displayValue(cell as Exclude<Cell, null | undefined>).replace(/\s+/g, " ");
    if (!name) {
      empty++;
      name = `Column ${i + 1}`;
    }
    if (name.length > 200) {
      truncated = true;
      name = name.slice(0, 200);
    }
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      issues.push({ code: "duplicate_header", column: name, message: `The column name “${name}” appears more than once. Later copies were renamed “${name} (${count})”.` });
      name = `${name} (${count})`;
    }
    return name;
  });
  if (empty) issues.unshift({ code: "empty_header", message: `${empty} column${empty === 1 ? " has" : "s have"} no name and ${empty === 1 ? "was" : "were"} named by position (for example “Column 1”).` });
  if (truncated) issues.push({ code: "truncated_header", message: "Some column names were longer than 200 characters and were shortened." });
  return { headers, issues };
}

export function createProfiler(rawHeaders: Cell[], options: ProfilerOptions = {}) {
  const previewLimit = options.previewRows ?? 200;
  const maxDistinct = options.maxDistinct ?? 5000;
  const strictWidth = options.strictWidth ?? false;
  const maxRows = options.maxRows ?? FILE_LIMITS.maxRows;
  // Drop trailing columns that have no header (common in spreadsheets with stray formatting).
  let width = rawHeaders.length;
  while (width > 0 && isNullish(rawHeaders[width - 1])) width--;
  if (width === 0) throw new DatasetParseError("The first row is empty. Put column names in the first row and try again.");
  if (width > FILE_LIMITS.maxColumns) {
    throw new DatasetParseError(`Files can have up to ${FILE_LIMITS.maxColumns} columns; this one has ${width.toLocaleString("en-US")}. If it isn't a data table, check the file type.`);
  }
  const { headers, issues } = normalizeHeaders(rawHeaders.slice(0, width));

  const states: ColumnState[] = headers.map((name) => ({
    name,
    nulls: 0,
    nonNull: 0,
    typeHits: { text: 0, integer: 0, decimal: 0, currency: 0, percent: 0, boolean: 0, date: 0 },
    explicitSymbol: { currency: 0, percent: 0 },
    distinct: new Set<string>(),
    distinctCapped: false,
    samples: [],
    numericMin: Infinity,
    numericMax: -Infinity,
    dateMin: null,
    dateMax: null,
  }));
  const rawPreview: Cell[][] = [];
  let rowCount = 0;
  let raggedRows = 0;
  let longValues = 0;

  function add(row: Cell[]) {
    if (row.every(isNullish)) return;
    rowCount++;
    if (rowCount > maxRows) throw new DatasetParseError(`Files can have up to ${maxRows.toLocaleString("en-US")} rows. Split the file or remove rows you don't need.`);
    for (let i = 0; i < width; i++) {
      const c = row[i];
      if (typeof c === "string" && c.length > FILE_LIMITS.maxCellChars) longValues++;
    }
    if (row.length > width && row.slice(width).some((c) => !isNullish(c))) raggedRows++;
    else if (strictWidth && row.length < width) raggedRows++;

    for (let i = 0; i < width; i++) {
      const cell = row[i];
      const state = states[i];
      if (isNullish(cell)) {
        state.nulls++;
        continue;
      }
      const value = cell as Exclude<Cell, null | undefined>;
      state.nonNull++;
      const types = matches(value);
      for (const t of types) state.typeHits[t]++;
      if (typeof value === "string") {
        if (CURRENCY_RE.test(value.trim())) state.explicitSymbol.currency++;
        if (PERCENT_RE.test(value.trim())) state.explicitSymbol.percent++;
      }
      const shown = displayValue(value);
      if (!state.distinctCapped) {
        state.distinct.add(shown);
        if (state.distinct.size > maxDistinct) state.distinctCapped = true;
      }
      if (state.samples.length < 5 && !state.samples.includes(shown)) state.samples.push(shown);
      if (types.has("decimal") || types.has("currency") || types.has("percent")) {
        const n = typeof value === "number" ? value : parseLooseNumber(String(value));
        if (Number.isFinite(n)) {
          if (n < state.numericMin) state.numericMin = n;
          if (n > state.numericMax) state.numericMax = n;
        }
      }
      if (types.has("date")) {
        const iso = toIsoDate(value);
        if (iso) {
          if (state.dateMin === null || iso < state.dateMin) state.dateMin = iso;
          if (state.dateMax === null || iso > state.dateMax) state.dateMax = iso;
        }
      }
    }
    if (rawPreview.length < previewLimit) rawPreview.push(row.slice(0, width));
  }

  function resolveType(state: ColumnState): ColumnDataType {
    if (state.nonNull === 0) return "text";
    const needed = Math.ceil(state.nonNull * TYPE_THRESHOLD);
    for (const candidate of CANDIDATES) {
      if (state.typeHits[candidate] < needed) continue;
      // Plain numbers qualify for currency and percent; require the symbol on most values before choosing them.
      if (candidate === "percent" && state.explicitSymbol.percent < needed) continue;
      if (candidate === "currency" && state.explicitSymbol.currency < Math.ceil(state.nonNull * 0.5)) continue;
      return candidate;
    }
    return "text";
  }

  function toPreviewCell(cell: Cell, type: ColumnDataType): PreviewCell {
    if (isNullish(cell)) return null;
    const normalized = normalizeCell(cell, type);
    return normalized === null ? displayValue(cell as Exclude<Cell, null | undefined>).slice(0, FILE_LIMITS.maxCellChars) : normalized;
  }

  function finish(): DatasetProfile {
    const columns: ColumnProfile[] = states.map((state, position) => {
      const dataType = resolveType(state);
      const numeric = dataType === "integer" || dataType === "decimal" || dataType === "currency" || dataType === "percent";
      if (state.nonNull > 0 && dataType !== "text" && state.typeHits[dataType] < state.nonNull) {
        const odd = state.nonNull - state.typeHits[dataType];
        issues.push({ code: "mixed_types", column: state.name, message: `${odd.toLocaleString("en-US")} value${odd === 1 ? "" : "s"} in “${state.name}” ${odd === 1 ? "doesn't" : "don't"} match its detected type (${dataType}).` });
      }
      if (rowCount >= 10 && state.nulls / rowCount > 0.5) {
        issues.push({ code: "mostly_empty", column: state.name, message: `“${state.name}” is empty in ${Math.round((state.nulls / rowCount) * 100)}% of rows.` });
      }
      return {
        position,
        name: state.name,
        dataType,
        nullCount: state.nulls,
        distinctCount: state.distinct.size,
        distinctCapped: state.distinctCapped,
        min: numeric && Number.isFinite(state.numericMin) ? String(state.numericMin) : dataType === "date" ? state.dateMin : null,
        max: numeric && Number.isFinite(state.numericMax) ? String(state.numericMax) : dataType === "date" ? state.dateMax : null,
        samples: state.samples,
      };
    });
    if (longValues) issues.push({ code: "long_values", message: `${longValues.toLocaleString("en-US")} value${longValues === 1 ? " was" : "s were"} longer than ${FILE_LIMITS.maxCellChars.toLocaleString("en-US")} characters and ${longValues === 1 ? "was" : "were"} shortened.` });
    if (raggedRows) issues.push({ code: "ragged_rows", message: `${raggedRows.toLocaleString("en-US")} row${raggedRows === 1 ? " has" : "s have"} a different number of values than the header row.` });
    if (rowCount === 0) issues.push({ code: "no_rows", message: "The file has column names but no data rows." });
    const preview = rawPreview.map((row) => columns.map((c, i) => toPreviewCell(row[i], c.dataType)));
    return { rowCount, columns, preview, issues };
  }

  return { add, finish, headers };
}

export type RowSource = { kind: "csv"; text: string } | { kind: "xlsx"; data: ArrayBuffer | Uint8Array };
type RowHandler = (row: Cell[]) => void | Promise<void>;

/**
 * Streams CSV rows in 1 MB chunks, pausing between chunks (and while the handler awaits) so large files
 * don't block the event loop. The delimiter (comma, semicolon, tab, pipe) is detected from the start of the file.
 */
async function readCsvRows(text: string, onRow: RowHandler) {
  const papaModule = (await import("papaparse")) as unknown as { default?: typeof import("papaparse") } & typeof import("papaparse");
  const Papa = papaModule.default ?? papaModule;
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!clean.trim()) throw new DatasetParseError("The file is empty.");
  // Text files don't contain NUL bytes; binary files (images, archives, PDFs) renamed to .csv do.
  if (clean.slice(0, 1024 * 1024).includes("\u0000")) throw new DatasetParseError("This doesn't look like a text CSV file. Export the data as CSV (or .xlsx) and try again.");
  const sniff = Papa.parse<string[]>(clean.slice(0, 64 * 1024), { preview: 20, delimitersToGuess: [",", ";", "\t", "|"] });
  const delimiter = sniff.meta.delimiter || ",";

  await new Promise<void>((resolve, reject) => {
    let failed = false;
    Papa.parse<string[]>(clean, {
      delimiter,
      skipEmptyLines: "greedy",
      chunkSize: 1024 * 1024,
      chunk: (result: import("papaparse").ParseResult<string[]>, parser: import("papaparse").Parser) => {
        parser.pause();
        (async () => {
          for (const row of result.data) {
            const pending = onRow(row);
            if (pending) await pending;
          }
        })().then(
          () => setImmediate(() => parser.resume()),
          (error) => {
            failed = true;
            parser.abort();
            reject(error);
          },
        );
      },
      complete: () => {
        if (!failed) resolve();
      },
      error: (error: Error) => reject(new DatasetParseError(`The CSV couldn't be read: ${error.message}`)),
    });
  });
}

type ExcelValue = import("exceljs").CellValue;

function excelCell(value: ExcelValue): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) return value;
  if (typeof value === "object") {
    if ("result" in value) return excelCell(value.result as ExcelValue);
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return String(value.text);
    if ("error" in value) return null;
  }
  return String(value);
}

/** Streams rows from the first worksheet of an .xlsx workbook, skipping blank rows above the header. */
async function readXlsxRows(data: ArrayBuffer | Uint8Array, onRow: RowHandler) {
  // exceljs is CommonJS: the namespace shape differs between Node ESM and the Next.js server bundle.
  const excelModule = (await import("exceljs")) as unknown as { default?: typeof import("exceljs") } & typeof import("exceljs");
  const ExcelJS = excelModule.default ?? excelModule;
  const buffer = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new DatasetParseError("This doesn't look like an .xlsx file. Older .xls files aren't supported; save the sheet as .xlsx or CSV.");
  }
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(buffer), {
    worksheets: "emit",
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "cache",
    entries: "emit",
  });
  let seenHeader = false;
  let count = 0;
  try {
    for await (const worksheet of reader) {
      for await (const row of worksheet) {
        const values = (row.values as ExcelValue[]).slice(1).map(excelCell);
        if (!seenHeader) {
          if (values.every((v) => isNullish(v))) continue;
          seenHeader = true;
        }
        await onRow(values);
        if (++count % 2000 === 0) await new Promise((r) => setImmediate(r));
      }
      break;
    }
  } catch (error) {
    if (error instanceof DatasetParseError) throw error;
    throw new DatasetParseError("The workbook couldn't be read. Check that it opens in Excel, then save it again as .xlsx.");
  }
  if (!seenHeader) throw new DatasetParseError("The first worksheet is empty.");
}

/** Calls onRow for every row, header first. */
export function readRows(source: RowSource, onRow: RowHandler) {
  return source.kind === "csv" ? readCsvRows(source.text, onRow) : readXlsxRows(source.data, onRow);
}

export async function profileRows(source: RowSource, options?: ProfilerOptions): Promise<DatasetProfile> {
  let profiler: ReturnType<typeof createProfiler> | null = null;
  await readRows(source, (row) => {
    if (!profiler) profiler = createProfiler(row, { strictWidth: source.kind === "csv", ...options });
    else profiler.add(row);
  });
  if (!profiler) throw new DatasetParseError("The file is empty.");
  return (profiler as ReturnType<typeof createProfiler>).finish();
}

export const profileCsv = (text: string, options?: ProfilerOptions) => profileRows({ kind: "csv", text }, options);
export const profileXlsx = (data: ArrayBuffer | Uint8Array, options?: ProfilerOptions) => profileRows({ kind: "xlsx", data }, options);

/**
 * Streams the data rows (header skipped, fully-empty rows skipped, same order as profiling) converted to the
 * detected column types. Rows are delivered in batches so the caller can write them without holding the file.
 */
export async function forEachNormalizedBatch(
  source: RowSource,
  types: ColumnDataType[],
  batchSize: number,
  onBatch: (rows: NormalizedCell[][], firstRowNumber: number) => Promise<void>,
  maxRows = Infinity,
) {
  let header = true;
  let batch: NormalizedCell[][] = [];
  let next = 1;
  let delivered = 0;
  const flush = async () => {
    if (!batch.length) return;
    const rows = batch;
    batch = [];
    await onBatch(rows, next);
    next += rows.length;
  };
  await readRows(source, async (row) => {
    if (header) {
      header = false;
      return;
    }
    if (delivered >= maxRows || row.every(isNullish)) return;
    batch.push(types.map((type, i) => normalizeCell(row[i], type)));
    delivered++;
    if (batch.length >= batchSize) await flush();
  });
  await flush();
  return delivered;
}
