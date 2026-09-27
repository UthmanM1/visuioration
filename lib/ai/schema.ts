import { isNumeric } from "../visualizations/definition";
import type { QueryableDataset } from "../visualizations/definition";

/**
 * Stage 1: schema understanding. Describes the workspace's datasets to the model: names, column types,
 * ranges and a few sample category values. Never the rows themselves.
 */
export function describeSchema(datasets: QueryableDataset[]) {
  const aliases = new Map<string, QueryableDataset>();
  const described = datasets.map((d, i) => {
    const alias = `D${i + 1}`;
    aliases.set(alias, d);
    return {
      alias,
      name: d.name,
      rows: d.queryRowCount,
      columns: d.fields.map((f) => ({
        name: f.name,
        type: f.type,
        ...(f.type === "date" && f.min && f.max ? { range: [f.min.slice(0, 10), f.max.slice(0, 10)] } : {}),
        ...(isNumeric(f.type) && f.min !== null && f.max !== null ? { min: Number(f.min), max: Number(f.max) } : {}),
        // Examples only for low-cardinality category columns (for filters like Region = "West"), and only short values.
        ...(f.type === "text" ? { distinct_values: f.distinctCount, ...(f.distinctCount <= 50 ? { examples: f.samples.filter((v) => v.length <= 40).slice(0, 5) } : {}) } : {}),
      })),
    };
  });
  return { json: JSON.stringify(described), aliases };
}
