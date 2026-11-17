import { itemImage } from "@/components/og/og-image";

export const alt = "The full set: every FiltersUI filter on one board, with Clear all and a Show button.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return itemImage("cars-board");
}
