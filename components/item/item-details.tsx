import type { ReactNode } from "react";
import { FILTER_CARD_PROPS, type PropRow, type RegistryItem } from "@/registry/items";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-card pt-8">
      <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.01em] text-text">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Lines({ lines, columns = false }: { lines: string[]; columns?: boolean }) {
  return (
    <ul className={columns ? "grid gap-x-8 sm:grid-cols-2" : ""}>
      {lines.map((line) => (
        <li key={line} className="border-b border-card py-3 text-[15px] leading-[1.55] text-mute last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
          {line}
        </li>
      ))}
    </ul>
  );
}

function Props({ rows, caption }: { rows: PropRow[]; caption: string }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-sm:sr-only">
        <tr className="text-[13px] leading-5 text-dim">
          <th scope="col" className="w-[38%] pb-2 pr-6 font-normal">Prop</th>
          <th scope="col" className="pb-2 font-normal">Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-t border-card align-top max-sm:flex max-sm:flex-col max-sm:gap-1 max-sm:py-3">
            <th scope="row" className="py-3.5 pr-6 font-normal max-sm:p-0">
              <code className="font-mono text-[13.5px] leading-5 break-words text-text">{row.name}</code>
              <div className="mt-1 text-[13px] leading-5 text-dim max-sm:ml-2 max-sm:mt-0 max-sm:inline">
                {row.required ? "Required" : row.default ? `Default ${row.default}` : "Optional"}
              </div>
            </th>
            <td className="py-3.5 max-sm:p-0">
              <p className="text-[15px] leading-[1.55] text-mute">{row.meaning}</p>
              <code className="mt-1.5 block font-mono text-[12.5px] max-sm:mt-1 leading-5 text-dim [overflow-wrap:anywhere]">{row.type}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ItemDetails({ item }: { item: RegistryItem }) {
  return (
    <div className="flex max-w-[760px] flex-col gap-12">
      <Section title="What it does">
        <Lines lines={item.does} />
      </Section>

      {item.keyboard.length > 0 && (
        <Section title="Keyboard">
          <Lines lines={item.keyboard} />
        </Section>
      )}

      <Section title="Props">
        <p className="mb-6 text-[15px] leading-[1.55] text-mute">
          <span className="text-text">Value.</span> {item.value}
        </p>
        <Props rows={item.props} caption={`${item.component} props`} />
        {item.kind === "filter" && item.card !== false && (
          <div className="mt-10">
            <h3 className="mb-4 text-[16px] font-semibold leading-6 text-text">
              The card: <code className="font-mono text-[15px] font-normal">FilterCard</code>
            </h3>
            <Props rows={FILTER_CARD_PROPS} caption="FilterCard props" />
          </div>
        )}
      </Section>
    </div>
  );
}
