import { itemImage } from "@/components/og/og-image";

export const alt = "Filter panel: every car filter in one tall panel, as rows that open and close.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return itemImage("filter-panel");
}
