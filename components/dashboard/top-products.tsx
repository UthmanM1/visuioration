import { Delta } from "@/components/ui/delta";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { topProducts } from "@/lib/demo-data";
import { formatCurrency, formatNumber } from "@/lib/format";

export function TopProducts({ limit = 6 }: { limit?: number }) {
  const rows = topProducts.slice(0, limit);
  return (
    <Panel>
      <PanelHeader title="Top products" description="FY26 revenue, growth is Q2 vs Q1" />
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Top products by revenue</caption>
          <thead className="border-y border-line bg-paper/60 text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Revenue</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Orders</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Conversion</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Growth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.sku} className="border-b border-line last:border-0 hover:bg-paper/60">
                <th scope="row" className="px-5 py-3 font-normal">
                  <span className="block font-medium text-ink">{p.name}</span>
                  <span className="text-[12px] text-ink-muted">{p.category} · {p.sku}</span>
                </th>
                <td className="tnum px-3 py-3 text-right font-medium">{formatCurrency(p.revenue)}</td>
                <td className="tnum px-3 py-3 text-right text-ink-soft">{formatNumber(p.orders)}</td>
                <td className="tnum px-3 py-3 text-right text-ink-soft">{p.conversion.toFixed(1)}%</td>
                <td className="px-5 py-3 text-right"><Delta value={p.growth} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line md:hidden">
        {rows.map((p) => (
          <li key={p.sku} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-[12px] text-ink-muted">{p.category}</p>
              </div>
              <Delta value={p.growth} />
            </div>
            <dl className="tnum mt-2 grid grid-cols-3 text-[12px]">
              <div><dt className="text-ink-faint">Revenue</dt><dd className="font-medium">{formatCurrency(p.revenue, { compact: true })}</dd></div>
              <div><dt className="text-ink-faint">Orders</dt><dd>{formatNumber(p.orders)}</dd></div>
              <div><dt className="text-ink-faint">Conversion</dt><dd>{p.conversion.toFixed(1)}%</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
