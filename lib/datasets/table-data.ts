import { salesColumns, salesSample } from "../demo-data";
import type { ColumnDataType } from "../supabase/database.types";

/** Client-safe shapes for the dataset preview table. */
export interface TableColumn {
  key: string;
  label: string;
  /** Display label for the type badge, for example "Currency". */
  type: string;
  kind: ColumnDataType | "category";
  nulls: string;
  distinct: string;
  min?: string | null;
  max?: string | null;
  samples?: string[];
}

export type TableCell = string | number | boolean | null;
export type TableRow = Record<string, TableCell>;

export interface DatasetTableData {
  columns: TableColumn[];
  rows: TableRow[];
  totalRows: number;
  filterKeys: string[];
  searchKeys: string[];
  /** Column used as the React key for rows, if one is unique; otherwise the row index is used. */
  rowKey: string | null;
  defaultSort: { key: string; dir: "asc" | "desc" } | null;
  extraColumnsNote?: string;
}

export const typeLabels: Record<ColumnDataType, string> = {
  text: "Text",
  integer: "Integer",
  decimal: "Decimal",
  currency: "Currency",
  percent: "Percent",
  boolean: "Boolean",
  date: "Date",
};

/** Northstar sample used in demo mode. */
export function sampleTableData(): DatasetTableData {
  const kinds: Record<string, TableColumn["kind"]> = { Date: "date", Text: "text", Category: "category", Currency: "currency", Integer: "integer" };
  return {
    columns: salesColumns.map((c) => ({ key: c.key, label: c.label, type: c.type, kind: kinds[c.type] ?? "text", nulls: c.nulls, distinct: c.distinct })),
    rows: salesSample as unknown as TableRow[],
    totalRows: 184_290,
    filterKeys: ["region", "category", "channel", "device"],
    searchKeys: ["orderId", "product", "region", "category"],
    rowKey: "orderId",
    defaultSort: { key: "date", dir: "desc" },
    extraColumnsNote: "14 additional columns (store ID, SKU, discount, fulfilment and campaign fields) are available in the full dataset.",
  };
}
