"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "../ui/button";
import { CopyButton } from "../ui/copy-button";
import { PlusIcon } from "../ui/icons";
import { TextLink } from "../ui/link";

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="@container flex flex-col gap-3">
      <h3 className="text-[13px] leading-5 font-medium text-[var(--fu-dim,#8C8C8C)]">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

export default function ButtonsExample() {
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Stands in for a request that takes a moment.
  const send = (name: string) => {
    setBusy(name);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBusy(null), 1600);
  };

  // Placeholder links: they stay on this page.
  const stay = (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault();

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-8">
      <Row title="Variants">
        <Button>Show 138 cars</Button>
        <Button variant="secondary">Save search</Button>
        {/* In a narrow column the two quiet looks take their own line, pulled back so their words start on the edge. */}
        <span className="flex gap-2 @max-[420px]:-ml-3.5 @max-[420px]:basis-full">
          <Button variant="ghost">Clear all</Button>
          <Button variant="quiet">Cancel</Button>
        </span>
      </Row>
      <Row title="Sizes and icons">
        <Button size="sm" variant="secondary" before={<PlusIcon />}>
          Add filter
        </Button>
        <Button size="lg">Search cars</Button>
      </Row>
      <Row title="Copy: press one">
        <CopyButton text="npx shadcn@latest add https://filtersui.com/r/buttons.json" label="Copy code" announce="Code copied" />
        <CopyButton variant="primary" size="lg" text="Show me cars under $30k" label="Copy prompt" announce="Prompt copied" />
        <CopyButton size="lg" text="https://filtersui.com/basics/buttons" aria-label="Copy link" announce="Link copied" />
      </Row>
      <Row title="Busy: press one">
        <Button busy={busy === "save"} onClick={() => send("save")}>
          Save search
        </Button>
        <Button variant="secondary" busy={busy === "apply"} onClick={() => send("apply")}>
          Apply
        </Button>
      </Row>
      <Row title="Links">
        <p className="w-full text-[15px] leading-[1.6] text-[var(--fu-mute,#BDBDBD)]">
          Free and MIT licensed, from{" "}
          <TextLink href="https://filtersui.com" target="_blank">
            filtersui.com
          </TextLink>
          .
        </p>
        <div className="-ml-1 flex flex-wrap items-center gap-x-5">
          <TextLink variant="quiet" arrow="back" href="#" onClick={stay}>
            All cars
          </TextLink>
          <TextLink variant="quiet" arrow="forward" href="#" onClick={stay}>
            Next page
          </TextLink>
        </div>
      </Row>
    </div>
  );
}
