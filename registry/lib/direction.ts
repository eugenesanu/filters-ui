// Right-to-left helpers for positions and keys worked out in script. Each reads the direction from the element
// itself, so it is right when only a parent sets dir="rtl".

/** True when the element lays out right to left. */
export const isRtl = (node: Element | null | undefined) => !!node && getComputedStyle(node).direction === "rtl";

/**
 * The arrow key as a step in reading order: in right-to-left, ArrowLeft moves forward and ArrowRight back, as the
 * ARIA patterns ask for horizontal widgets. Every other key comes back as it is.
 */
export function readingKey(key: string, node: Element | null | undefined): string {
  if ((key !== "ArrowLeft" && key !== "ArrowRight") || !isRtl(node)) return key;
  return key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
}

/** A child's offset from its offset parent's start edge: its offsetLeft, or the distance from the right in RTL. */
export function startOffset(node: HTMLElement): number {
  if (!isRtl(node)) return node.offsetLeft;
  const parent = node.offsetParent as HTMLElement | null;
  return (parent?.clientWidth ?? 0) - node.offsetLeft - node.offsetWidth;
}

/** Calls back whenever a dir attribute on the page changes, so a position measured in script can be taken again. */
export function onDirChange(callback: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"], subtree: true });
  return () => observer.disconnect();
}
