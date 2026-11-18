import type { ReactNode } from "react";
import { FILTER_CARD_PROPS, type PropRow, type RegistryItem } from "@/registry/items";
import { ChevronDownIcon } from "@/registry/ui/icons";

/** One closed row of notes that opens on a press. A native details element, so it works before the page's script
 * loads and the browser's find-in-page opens it; .fu-notes in globals.css animates the height where it can. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="fu-notes group/notes border-t border-card last:border-b">
      <summary className="group/summary flex cursor-pointer list-none items-center justify-between gap-4 rounded-[8px] py-5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-accent-soft [&::-webkit-details-marker]:hidden">
        <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.01em] text-text">{title}</h2>
        <ChevronDownIcon
          size={20}
          className="shrink-0 text-dim transition-[rotate,color] duration-300 ease-smooth group-open/notes:rotate-180 group-hover/summary:text-text motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-8">{children}</div>
    </details>
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
    <table className="w-full border-collapse text-start">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-sm:sr-only">
        <tr className="text-[13px] leading-5 text-dim">
          <th scope="col" className="w-[38%] pb-2 pe-6 font-normal">Prop</th>
          <th scope="col" className="pb-2 font-normal">Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-t border-card align-top max-sm:flex max-sm:flex-col max-sm:gap-1 max-sm:py-3">
            <th scope="row" className="py-3.5 pe-6 font-normal max-sm:p-0">
              <code dir="ltr" className="font-mono text-[13.5px] leading-5 break-words text-text">{row.name}</code>
              <div className="mt-1 text-[13px] leading-5 text-dim max-sm:ms-2 max-sm:mt-0 max-sm:inline">
                {row.required ? "Required" : row.default ? `Default ${row.default}` : "Optional"}
              </div>
            </th>
            <td className="py-3.5 max-sm:p-0">
              <p className="text-[15px] leading-[1.55] text-mute">{row.meaning}</p>
              <code className="mt-1.5 block font-mono text-[12.5px] max-sm:mt-1 leading-5 text-dim [overflow-wrap:anywhere]">
                {/* Code reads left to right on a right-to-left page too; the line still sits on the page's side. */}
                <span dir="ltr">{row.type}</span>
              </code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ItemDetails({ item }: { item: RegistryItem }) {
  return (
    <div className="max-w-[760px]">
      <Section title="What it does">
        <Lines lines={item.does} />
      </Section>

      {item.keyboard.length > 0 && (
        <Section title="Keyboard">
          <Lines lines={item.keyboard} />
        </Section>
      )}

      <Section title="Props">
        <p className="mb-6 pt-1 text-[15px] leading-[1.55] text-mute">
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
