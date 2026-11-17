// The one list of --fu-* colour tokens, each with its dark and light value. app/globals.css repeats these values
// (registry:check fails when the two disagree), registry code falls back to the dark value, and prompts read both.
// Dark is the default look of a copied component; light is turned on by setting the light values.
// Imports carry no extension and this file imports nothing, so Node can run it from scripts/check-registry.mjs.

export type ThemeToken = {
  /** Default: the fallback every registry file writes, e.g. var(--fu-card,#1F1F1F). */
  dark: string;
  light: string;
  /** Used by the site only, never by a registry file. */
  site?: true;
};

export const TOKENS = {
  // Surfaces
  "--fu-page": { dark: "#0A0A0A", light: "#F5F5F3" },
  "--fu-panel": { dark: "#141414", light: "#EDEDEA" },
  "--fu-card": { dark: "#1F1F1F", light: "#FFFFFF" },
  "--fu-card-hover": { dark: "#262626", light: "#F8F8F6" },
  "--fu-surface-1": { dark: "#171717", light: "#FFFFFF" },
  "--fu-surface-3": { dark: "#2A2A2A", light: "rgb(29 27 24/0.07)" },
  "--fu-hover": { dark: "#333333", light: "rgb(29 27 24/0.11)" },
  // Hover fill of a choice that sits on a card (option, preset row, day, chip, tile): as quiet as the selected wash.
  "--fu-item-hover": { dark: "#2A2A2A", light: "#F2F2F0" },
  // The head of an open section on a card.
  "--fu-head-open": { dark: "#333333", light: "#EEEEEC" },
  // The sliding thumb of a segmented control.
  "--fu-thumb": { dark: "#404040", light: "#FFFFFF" },
  // The track under that thumb. Light is a wash, so it stays soft on a card and still shows on a panel.
  "--fu-segment-track": { dark: "#2A2A2A", light: "rgb(29 27 24/0.07)" },
  // The fill of a text field or select: clear in dark, white in light, also on a tinted card.
  "--fu-input": { dark: "rgb(0 0 0/0)", light: "#FFFFFF" },
  // A filled search box and the menu it opens. White in light, like every field and menu.
  "--fu-search": { dark: "#2A2A2A", light: "#FFFFFF" },
  // The edge of that menu: a hairline in light.
  "--fu-menu-edge": { dark: "#737373", light: "#C4C4C0" },
  "--fu-bar": { dark: "rgb(31 31 31/0.94)", light: "rgb(255 255 255/0.94)" },

  // Lines and edges
  "--fu-line": { dark: "#404040", light: "#C4C4C0" },
  "--fu-card-border": { dark: "#2A2A2A", light: "#E5E5E2" },
  "--fu-rail": { dark: "#4A4A4A", light: "#D6D6D2" },
  "--fu-control-border": { dark: "#737373", light: "#787874" },
  "--fu-control-hover": { dark: "#A3A3A3", light: "#5B5B57" },
  "--fu-swatch-edge": { dark: "rgb(255 255 255/0.2)", light: "rgb(29 27 24/0.2)" },

  // Text
  "--fu-text": { dark: "#F8F5F1", light: "#1B1B19" },
  "--fu-mute": { dark: "#BDBDBD", light: "#444442" },
  "--fu-dim": { dark: "#929292", light: "#555552" },
  "--fu-pill-text": { dark: "#C8C8C8", light: "#3C3C3A" },
  "--fu-swatch-text": { dark: "#EDEAE6", light: "#363634" },

  // Accent
  "--fu-accent": { dark: "#3B57E6", light: "#3B57E6" },
  "--fu-accent-hover": { dark: "#3450D4", light: "#2F4AD0" },
  "--fu-accent-soft": { dark: "#8FAAFF", light: "#3049D2" },
  "--fu-accent-pale": { dark: "#D1DDFF", light: "#253A9E" },
  "--fu-selected": { dark: "#1F2747", light: "#E8EDFD" },
  // A chosen filter as a token in a search box: fill, edge and words. Light matches a selected chip.
  "--fu-token": { dark: "#D1DDFF", light: "#E8EDFD" },
  "--fu-token-edge": { dark: "#D1DDFF", light: "#3049D2" },
  "--fu-token-text": { dark: "#171717", light: "#3049D2" },
  // A chart bar outside the chosen range. Light is a soft tint of the accent.
  "--fu-bar-out": { dark: "#4A4A4A", light: "#C1C8F1" },
  "--fu-on-accent": { dark: "#FFFFFF", light: "#FFFFFF" },
  "--fu-on-accent-mute": { dark: "#E1E7FF", light: "#E1E7FF" },
  "--fu-link-line": { dark: "rgb(143 170 255/0.4)", light: "rgb(52 80 216/0.4)" },

  // Washes: translucent fills for hover, press and quiet tracks
  "--fu-wash": { dark: "rgb(255 255 255/0.08)", light: "rgb(29 27 24/0.05)" },
  "--fu-hover-wash": { dark: "rgb(255 255 255/0.14)", light: "rgb(29 27 24/0.07)" },
  "--fu-field-wash": { dark: "rgb(255 255 255/0.03)", light: "#FFFFFF" },
  "--fu-track": { dark: "rgb(255 255 255/0.06)", light: "rgb(29 27 24/0.07)" },
  "--fu-pill": { dark: "rgb(255 255 255/0.1)", light: "rgb(29 27 24/0.06)" },
  "--fu-pill-hover": { dark: "rgb(255 255 255/0.16)", light: "rgb(29 27 24/0.1)" },
  // The square count pill beside a list row or tile.
  "--fu-pill-square": { dark: "#333333", light: "rgb(29 27 24/0.07)" },
  "--fu-row-active": { dark: "rgb(255 255 255/0.07)", light: "rgb(29 27 24/0.05)" },
  "--fu-row-hover": { dark: "rgb(255 255 255/0.1)", light: "rgb(29 27 24/0.06)" },
  "--fu-row-press": { dark: "rgb(255 255 255/0.12)", light: "rgb(29 27 24/0.09)" },
  "--fu-share": { dark: "rgb(255 255 255/0.05)", light: "rgb(29 27 24/0.04)" },
  "--fu-share-hover": { dark: "rgb(255 255 255/0.1)", light: "rgb(29 27 24/0.07)" },
  "--fu-well": { dark: "rgb(0 0 0/0.22)", light: "rgb(29 27 24/0.05)" },
  // A loading placeholder the size of the real content: counts, bars, names, fields. It pulses between this and half of it.
  "--fu-skeleton": { dark: "rgb(255 255 255/0.12)", light: "rgb(29 27 24/0.09)" },
  "--fu-skeleton-on": { dark: "rgb(143 170 255/0.3)", light: "rgb(48 73 210/0.18)" },

  // Range handles
  "--fu-handle": { dark: "#F8F5F1", light: "#FFFFFF" },
  "--fu-handle-edge": { dark: "rgb(0 0 0/0.25)", light: "rgb(29 27 24/0.55)" },

  // Depth
  "--fu-rim": { dark: "rgb(255 255 255/0.04)", light: "rgb(255 255 255/0.7)" },
  "--fu-shadow": { dark: "rgb(0 0 0/0.5)", light: "rgb(36 36 33/0.12)" },
  "--fu-shadow-deep": { dark: "rgb(0 0 0/0.8)", light: "rgb(36 36 33/0.16)" },
  "--fu-scrim": { dark: "rgb(0 0 0/0.6)", light: "rgb(29 27 24/0.32)" },

  // The coloured light along a glowing edge
  "--fu-glow-blue": { dark: "#4C6BFF", light: "#4C6BFF" },
  "--fu-glow-violet": { dark: "#8A6CFF", light: "#8A6CFF" },
  "--fu-glow-rose": { dark: "#EC8092", light: "#E8708A" },
  "--fu-glow-amber": { dark: "#F59E6C", light: "#F29358" },
  "--fu-glow-teal": { dark: "#2DD4BF", light: "#1FC2AD" },

  // Site only
  "--fu-selection": { dark: "#D1DDFF", light: "#CBD6FF", site: true },
  "--fu-selection-text": { dark: "#171717", light: "#1B1B19", site: true },
  "--fu-backdrop": { dark: "#1F1F1F", light: "#E6E6E3", site: true },
  "--fu-backdrop-near": { dark: "#2A2A2A", light: "#D8D8D4", site: true },
  "--fu-switch-off": { dark: "#2A2A2A", light: "#82827E", site: true },
  // Edge and shadow of the site's own knobs (Short version switch, hero handles): light only, dark keeps them bare.
  "--fu-knob-edge": { dark: "rgb(0 0 0/0)", light: "rgb(29 27 24/0.55)", site: true },
  "--fu-knob-shadow": { dark: "rgb(0 0 0/0)", light: "rgb(36 36 33/0.12)", site: true },
} as const satisfies Record<string, ThemeToken>;

export type TokenName = keyof typeof TOKENS;

export const tokenNames = Object.keys(TOKENS) as TokenName[];

/** The browser chrome colour per scheme, for the viewport's themeColor. */
export const THEME_COLOR = { dark: TOKENS["--fu-page"].dark, light: TOKENS["--fu-page"].light };

/** Where the header switch keeps a visitor's choice. With nothing stored the site follows the system. */
export const THEME_STORAGE_KEY = "fu-theme";

/** Runs in <head> before first paint: a stored choice sets data-theme on <html>; otherwise the media query decides. */
export const THEME_SCRIPT = `(function(){document.documentElement.setAttribute("data-js","");try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
