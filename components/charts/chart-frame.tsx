import type { ReactNode } from "react";
import { cn } from "@/lib/format";

interface ChartFrameProps {
  label: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  children: ReactNode;
  className?: string;
}

/** Wraps a visual chart with an accessible label and an equivalent data table for screen readers. */
export function ChartFrame({ label, columns, rows, children, className }: ChartFrameProps) {
  return (
    <figure className={cn("relative", className)}>
      <div role="img" aria-label={label} className="h-full w-full">
        {children}
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
