// Shared by the server (panel data) and the client panel, so it carries no "use client".
import type { PromptTarget } from "@/lib/prompt";
import type { Highlighted } from "@/components/copy/code-html";

export type Target = PromptTarget;
export const TARGETS: readonly Target[] = ["claude-code", "cursor", "v0", "lovable", "other"];

export type CodeFile = Highlighted & { savePath: string; name: string };

export type PanelData = {
  /** Every target's prompt is its own first and last line around a shared middle. */
  prompt: { heads: Record<Target, string>; tails: Record<Target, string>; full: string; short: string };
  usage: Highlighted;
  files: CodeFile[];
  dependencies: string[];
  registryUrl: string;
  /** One line: what it needs and what else it brings. */
  needs: string;
};
