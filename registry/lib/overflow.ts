import { useCallback, useRef } from "react";

/**
 * A ref for a box that scrolls: it marks the box `data-overflows` while its content is taller than the box. Chromium
 * counts a box with overflow-y auto as a scroll container even when it has nothing to scroll, so overscroll-contain on
 * it stops the page from scrolling under the pointer or a finger. Such a box contains only while it overflows:
 * `data-[overflows]:overscroll-contain`.
 */
export function useOverflows<T extends HTMLElement = HTMLDivElement>() {
  const stop = useRef<(() => void) | null>(null);
  return useCallback((node: T | null) => {
    stop.current?.();
    stop.current = null;
    if (!node) return;
    let live = true;
    let settling = false;
    const measure = () => {
      if (!live) return;
      node.toggleAttribute("data-overflows", node.scrollHeight > node.clientHeight + 1);
      // Content that moves in (a rise, a slide) overflows until it lands, and landing resizes nothing: measure again then.
      if (settling) return;
      // Only animations still running: a finished one held by fill is listed too, and its settled promise would loop.
      const moving = node
        .getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running" && animation.effect?.getComputedTiming().endTime !== Infinity);
      if (!moving.length) return;
      settling = true;
      void Promise.allSettled(moving.map((animation) => animation.finished)).then(() => {
        settling = false;
        measure();
      });
    };
    // A box stops growing at its max height while its content goes on, so the content is watched too.
    const sizes = new ResizeObserver(measure);
    const watch = () => {
      sizes.disconnect();
      sizes.observe(node);
      for (const child of node.children) sizes.observe(child);
    };
    const children = new MutationObserver(watch);
    watch();
    children.observe(node, { childList: true });
    stop.current = () => {
      live = false;
      sizes.disconnect();
      children.disconnect();
    };
  }, []);
}
