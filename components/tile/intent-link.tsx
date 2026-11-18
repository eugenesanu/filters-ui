"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// A tile's page is fetched once the pointer, a finger or focus reaches the tile. Fetched as tiles scrolled into view,
// the home page pulled in every item page in full.
export function IntentLink(props: ComponentProps<typeof Link>) {
  const [wanted, setWanted] = useState(false);
  const want = () => setWanted(true);
  return <Link {...props} prefetch={wanted ? null : false} onMouseEnter={want} onTouchStart={want} onFocus={want} />;
}
