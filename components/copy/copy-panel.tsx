"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/registry/lib/cn";
import { readingKey } from "@/registry/lib/direction";
import { Segmented } from "@/registry/ui/segmented";
import { Select } from "@/registry/ui/select";
import { CopyButton } from "@/components/copy/copy-button";
import { useStored } from "@/components/copy/use-stored";
import { TARGETS, type CodeFile, type PanelData, type Target } from "@/components/copy/panel-types";

const TARGET_LABELS: Record<Target, string> = { "claude-code": "Claude Code", cursor: "Cursor", v0: "v0", lovable: "Lovable", other: "Other" };

const TABS = ["prompt", "code", "install"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { prompt: "Prompt", code: "Code", install: "Install" };
const LENGTHS = ["full", "short"] as const;
const MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
type Manager = (typeof MANAGERS)[number];
const RUN: Record<Manager, string> = { npm: "npx", pnpm: "pnpm dlx", yarn: "yarn", bun: "bunx --bun" };

const promptOf = (data: PanelData, target: Target, length: "full" | "short") =>
  [data.prompt.heads[target], data.prompt[length], data.prompt.tails[target]].join("\n");

const allFiles = (files: CodeFile[]) => files.map((file) => `// ${file.savePath}\n\n${file.source.trimEnd()}`).join("\n\n");

function Label({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h3 className="text-[13px] font-medium leading-5 text-dim">{children}</h3>
      {action}
    </div>
  );
}

function Code({ html, className }: { html: string; className?: string }) {
  return (
    <div
      dir="ltr"
      className={cn("fu-code fu-scroll overflow-auto rounded-[12px] border border-card bg-page", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CommandRow({ command, announce, copyLabel }: { command: string; announce: string; copyLabel: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-card bg-page py-1.5 ps-4 pe-1.5">
      <code dir="ltr" className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1.5 font-mono text-[13px] leading-5 text-mute [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]">
        {command}
      </code>
      <CopyButton text={command} announce={announce} ariaLabel={copyLabel} />
    </div>
  );
}

function ShortToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group/switch inline-flex h-8 cursor-pointer items-center gap-2.5 rounded-[10px] text-[14px] leading-5 text-mute transition-[color] duration-200 ease-smooth hover:text-text"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-[34px] rounded-full transition-[background-color] duration-300 ease-smooth",
          on ? "bg-accent" : "bg-[var(--fu-switch-off)]",
        )}
      >
        <span
          className={cn(
            "absolute inset-s-0.5 top-0.5 size-4 rounded-full bg-[var(--fu-handle)] shadow-[0_0_0_0.5px_var(--fu-knob-edge),0_1px_2px_var(--fu-knob-shadow)] transition-[translate] duration-300 ease-smooth motion-reduce:transition-none",
            on && "translate-x-3.5 rtl:-translate-x-3.5",
          )}
        />
      </span>
      Short version
    </button>
  );
}

// Held by the panel, so a wide panel can draw these controls in its tab row while the prompt tab shows the text.
function usePromptChoice(data: PanelData, wide: boolean) {
  const [target, setTarget, stored] = useStored<Target>("fu:target", "claude-code", TARGETS);
  // A block's full prompt carries every file and is too long for many chat inputs.
  const [length, setLength] = useStored("fu:length", wide ? "short" : "full", LENGTHS);
  return { target, setTarget, stored, length, setLength, text: promptOf(data, target, length) };
}

type PromptChoice = ReturnType<typeof usePromptChoice>;

function TargetSelect({ choice, className }: { choice: PromptChoice; className: string }) {
  return (
    <Select
      // Mounted afresh once the stored choice is read, so a returning visitor sees it without a swap.
      key={choice.stored ? "stored" : "default"}
      prefix="For"
      label="Prompt for"
      className={className}
      value={choice.target}
      onChange={(value) => choice.setTarget(value as Target)}
      options={TARGETS.map((t) => ({ value: t, label: TARGET_LABELS[t] }))}
    />
  );
}

const CopyPrompt = ({ choice }: { choice: PromptChoice }) => (
  <CopyButton variant="primary" text={() => choice.text} label="Copy prompt" announce="Prompt copied" />
);

const LengthToggle = ({ choice }: { choice: PromptChoice }) => (
  <ShortToggle on={choice.length === "short"} onChange={(on) => choice.setLength(on ? "short" : "full")} />
);

/** The wide panel's controls, at the end of the tab row; on phones they stack under it at full width. */
function PromptControls({ choice }: { choice: PromptChoice }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 sm:ms-auto sm:w-auto sm:flex-nowrap">
      <LengthToggle choice={choice} />
      <div className="flex w-full gap-2 sm:w-auto">
        <TargetSelect choice={choice} className="min-w-0 flex-1 sm:w-[216px] sm:flex-none" />
        <CopyPrompt choice={choice} />
      </div>
    </div>
  );
}

function PromptTab({ choice, wide }: { choice: PromptChoice; wide: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!wide && (
        <>
          <div className="flex gap-2">
            <TargetSelect choice={choice} className="min-w-0 flex-1" />
            <CopyPrompt choice={choice} />
          </div>
          <div className="flex items-center justify-between">
            <LengthToggle choice={choice} />
          </div>
        </>
      )}
      {/* On phones a short faded preview, so the page scroll never fights an inner one; Copy carries the whole text. */}
      <pre
        dir="ltr"
        tabIndex={0}
        role="region"
        aria-label="Prompt text"
        className="fu-scroll min-h-[200px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-card bg-page p-4 font-mono text-[13px] leading-5 text-mute max-lg:max-h-[220px] max-lg:overflow-hidden max-lg:[mask-image:linear-gradient(to_bottom,#000_55%,transparent)] [overflow-wrap:anywhere]"
      >
        {choice.text}
      </pre>
    </div>
  );
}

function CodeTab({ data }: { data: PanelData }) {
  const [index, setIndex] = useState(0);
  const file = data.files[index];
  const manyFiles = data.files.length > 8;
  const id = useId();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Label action={<CopyButton text={data.usage.source} announce="Example copied" ariaLabel="Copy example" />}>Use it like this</Label>
        <Code html={data.usage.html} className="max-h-[220px]" />
      </section>

      {data.dependencies.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>Packages</Label>
          <CommandRow command={`npm install ${data.dependencies.join(" ")}`} announce="Install command copied" copyLabel="Copy package install command" />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <Label action={<CopyButton text={() => allFiles(data.files)} label="Copy all files" announce="All files copied" />}>
          {data.files.length === 1 ? "1 file" : `${data.files.length} files`}
        </Label>
        {manyFiles ? (
          <Select
            label="File"
            value={String(index)}
            onChange={(value) => setIndex(Number(value))}
            options={data.files.map((f, i) => ({ value: String(i), label: f.savePath.replace(/^components\/filters-ui\//, "") }))}
          />
        ) : (
          <div role="tablist" aria-label="Files" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {data.files.map((f, i) => (
              <button
                key={f.savePath}
                type="button"
                role="tab"
                id={`${id}-tab-${i}`}
                aria-controls={`${id}-panel`}
                aria-selected={i === index}
                tabIndex={i === index ? 0 : -1}
                onClick={() => setIndex(i)}
                onKeyDown={(event) => {
                  const last = data.files.length - 1;
                  const moves: Record<string, number> = { ArrowRight: (i + 1) % data.files.length, ArrowLeft: (i + last) % data.files.length, Home: 0, End: last };
                  const next = moves[readingKey(event.key, event.currentTarget)];
                  if (next === undefined) return;
                  event.preventDefault();
                  setIndex(next);
                  (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
                }}
                className={cn(
                  "h-8 shrink-0 cursor-pointer rounded-[9px] px-2.5 font-mono text-[12.5px] leading-5 transition-[background-color,color] duration-200 ease-smooth",
                  i === index ? "bg-surface-3 text-text" : "text-dim hover:bg-wash hover:text-text",
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 overflow-hidden rounded-[12px] border border-card bg-page">
          <div className="flex items-center justify-between gap-3 border-b border-card py-1.5 ps-4 pe-1.5">
            <span dir="ltr" className="min-w-0 truncate font-mono text-[12.5px] leading-5 text-dim">{file.savePath}</span>
            <CopyButton text={file.source} label="Copy file" announce={`${file.name} copied`} />
          </div>
          <div
            dir="ltr"
            className="fu-code fu-scroll overflow-auto"
            {...(manyFiles ? {} : { id: `${id}-panel`, role: "tabpanel", "aria-labelledby": `${id}-tab-${index}` })}
            dangerouslySetInnerHTML={{ __html: file.html }}
          />
        </div>
      </section>
    </div>
  );
}

function InstallTab({ data }: { data: PanelData }) {
  const [manager, setManager] = useStored<Manager>("fu:manager", "npm", MANAGERS);
  const command = `${RUN[manager]} shadcn@latest add ${data.registryUrl}`;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Package manager" className="-ms-2 flex items-center gap-1 text-[13px] leading-5">
        {MANAGERS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={m === manager}
            onClick={() => setManager(m)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center rounded-[9px] px-2 font-mono transition-[background-color,color] duration-200 ease-smooth",
              m === manager ? "text-text" : "text-dim hover:bg-wash hover:text-text",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <CommandRow command={command} announce="Install command copied" copyLabel="Copy install command" />
      <p className="text-[14px] leading-[22px] text-mute">{data.needs}</p>
      <p className="text-[14px] leading-[22px] text-dim">
        No components.json? Copy the prompt, or the files from Code, into your project instead.
      </p>
    </div>
  );
}

export function CopyPanel({ data, wide = false, className }: { data: PanelData; wide?: boolean; className?: string }) {
  const [tab, setTab] = useStored<Tab>("fu:tab", "prompt", TABS);
  const choice = usePromptChoice(data, wide);
  const tabs = (
    <Segmented
      label="Copy as"
      className={wide ? "w-full sm:w-[420px]" : undefined}
      options={TABS.map((t) => ({ value: t, label: TAB_LABELS[t] }))}
      value={tab}
      onChange={setTab}
    />
  );

  return (
    <section
      aria-label="Copy"
      className={cn("flex min-h-0 flex-col rounded-[24px] border border-card bg-panel p-4 sm:p-5", className)}
    >
      <h2 className="sr-only">Copy</h2>
      {wide ? (
        // As tall as the controls on every tab, so switching tabs does not move the content under it.
        <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-3">
          {tabs}
          {tab === "prompt" && <PromptControls choice={choice} />}
        </div>
      ) : (
        tabs
      )}
      <div
        role="region"
        aria-label={TAB_LABELS[tab]}
        className={cn("mt-4 flex min-h-0 flex-1 flex-col", tab !== "prompt" && "fu-scroll overflow-y-auto overflow-x-hidden")}
      >
        {tab === "prompt" && <PromptTab choice={choice} wide={wide} />}
        {tab === "code" && <CodeTab data={data} />}
        {tab === "install" && <InstallTab data={data} />}
      </div>
    </section>
  );
}
