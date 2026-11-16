// Every item the site shows, in display order. Adding a filter: one entry here plus registry/examples/<slug>.tsx,
// whose relative imports use double quotes. Then add the slug to components/stage/example-of.ts (registry:check
// says so if you forget). Optional: a car preset in components/tile/previews.tsx and components/stage/filter-stage.tsx,
// the slug in other items' related lists, a new npm package in package.json dependencies, and for a block its
// own page under app/sets plus SET_PATHS in lib/site.ts. A filter that does not sit in FilterCard sets card: false
// (and usually its own connect text). A basic (kind "basic": a plain control such as a select, with no card) lives in
// registry/ui, gets its page at /basics/<slug> and shows in the home page's Basics section; it needs its own connect
// text and a tile preview in components/tile/previews.tsx. "New" shows on items whose addedIn is above 1.0.0.
// Paths are from the repo root. The props tables are written by hand from the components: keep them in step.

export type ItemKind = "filter" | "basic" | "block";

export type PropRow = {
  name: string;
  type: string;
  /** Left out for a prop with no default. */
  default?: string;
  required?: boolean;
  meaning: string;
};

export type RegistryItem = {
  slug: string;
  title: string;
  kind: ItemKind;
  /** One plain sentence, for the page head and for prompts. Not shown on tiles. */
  description: string;
  /** The exported component in `entry`. */
  component: string;
  entry: string;
  example: string;
  addedIn: string;
  updatedIn: string;
  /** The value the component holds, in words, with its type. */
  value: string;
  props: PropRow[];
  /** 3 to 5 lines: what it does. */
  does: string[];
  keyboard: string[];
  /** What a rewrite must keep for screen readers and keyboards. */
  accessibility: string[];
  related: string[];
  /** False for a filter that does not sit in FilterCard; its page and prompt then leave the card out. */
  card?: false;
  /** The prompt's "Connect it to my data" paragraph, when the usual one does not fit. */
  connect?: string;
};

const RANGE_DATA: PropRow[] = [
  { name: "buckets", type: "readonly number[]", meaning: "Item count per bar, spread evenly from min to max. Leave out for a plain slider." },
  { name: "format", type: "(value: number) => string", default: "1,234", meaning: "Text for a value in the field, the tooltip and screen readers, e.g. \"$45,000\"." },
  { name: "parse", type: "(text: string) => number | null", default: "reads \"45k\" and \"1.2m\"", meaning: "Reads a typed value. Return null when the text holds no number." },
];

const RANGE_TAIL: PropRow[] = [
  { name: "barScale", type: "number", default: "1", meaning: "Bar width as a share of its slot, so a chart with few bars keeps the rhythm of a denser one." },
  { name: "disabled", type: "boolean", default: "false", meaning: "Dims the filter and blocks input." },
];

const CHOICE_SHARED: PropRow[] = [
  { name: "label", type: "string", required: true, meaning: "Accessible name of the group." },
  { name: "formatCount", type: "(n: number) => string", default: "1,234", meaning: "Text in each count pill." },
  { name: "countLabel", type: "(n: number) => string", default: "\"6 results\"", meaning: "Screen-reader words for a count, e.g. \"6 cars\"." },
];

/** The card every filter sits in. Shipped with each filter item. */
export const FILTER_CARD_PROPS: PropRow[] = [
  { name: "title", type: "string", required: true, meaning: "The card's heading, e.g. \"Price\"." },
  { name: "summary", type: "string | null", meaning: "The value in words, shown on the closed card. Null or empty means the filter is unset." },
  { name: "onClear", type: "() => void", meaning: "Clears this filter. When given, a Clear button takes the summary's place while open or hovered." },
  { name: "open / defaultOpen / onOpenChange", type: "boolean / boolean / (open: boolean) => void", default: "closed", meaning: "Controlled or uncontrolled open state." },
  { name: "headingLevel", type: "2 | 3 | 4 | 5 | 6", default: "3", meaning: "Heading level around the head button." },
  { name: "bodyClassName", type: "string", meaning: "Classes for the body, e.g. to tune the space under the content." },
];

export const ITEMS: RegistryItem[] = [
  {
    slug: "icon-tiles",
    title: "Icon tiles",
    kind: "filter",
    description: "Pick one or more types by icon, such as body styles.",
    component: "IconTiles",
    entry: "registry/filters/icon-tiles.tsx",
    example: "registry/examples/icon-tiles.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "V[], where V is a string: the values that are on. [] is no filter.",
    props: [
      { name: "options", type: "readonly { value: V; label: string; icon: ReactNode; count: number }[]", required: true, meaning: "The tiles. The icon is any SVG drawn in currentColor; var(--tile-bg) is the tile's own background, for cut-outs." },
      { name: "value", type: "readonly V[]", required: true, meaning: "The values that are on." },
      { name: "onChange", type: "(value: V[]) => void", required: true, meaning: "Called with the new list." },
      ...CHOICE_SHARED,
    ],
    does: [
      "Each tile toggles on or off; several can be on.",
      "The icon takes the accent colour on hover and when on.",
      "A tile with a count of 0 is dimmed and cannot be turned on.",
      "Icons are yours: any SVG 28px high, filled with currentColor.",
    ],
    keyboard: [
      "Each tile is a button: Tab moves between them, Space or Enter toggles.",
    ],
    accessibility: [
      "Tiles are toggle buttons with aria-pressed, inside a named group.",
      "Each tile is read as its name and count (\"SUV, 3 cars\"); the icon is hidden from screen readers.",
    ],
    related: ["chip-group", "color-swatches"],
  },
  {
    slug: "color-swatches",
    title: "Colour swatches",
    kind: "filter",
    description: "Pick one or more colours.",
    component: "ColorSwatches",
    entry: "registry/filters/color-swatches.tsx",
    example: "registry/examples/color-swatches.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "V[], where V is a string: the colours that are on. [] is no filter.",
    props: [
      { name: "options", type: "readonly { value: V; label: string; color: string; count: number }[]", required: true, meaning: "The swatches. color is any CSS colour for the dot." },
      { name: "value", type: "readonly V[]", required: true, meaning: "The values that are on." },
      { name: "onChange", type: "(value: V[]) => void", required: true, meaning: "Called with the new list." },
      { name: "label", type: "string", required: true, meaning: "Accessible name of the group." },
      { name: "countLabel", type: "(n: number) => string", default: "\"6 results\"", meaning: "Screen-reader words for a count, e.g. \"6 cars\". Counts are not shown on screen." },
    ],
    does: [
      "Each swatch toggles on or off; several can be on.",
      "A chosen swatch gets a light ring and a soft wash behind it.",
      "A colour with a count of 0 is dimmed and cannot be turned on.",
      "Counts are read out but not drawn, to keep the grid calm.",
    ],
    keyboard: [
      "Each swatch is a button: Tab moves between them, Space or Enter toggles.",
    ],
    accessibility: [
      "Swatches are toggle buttons with aria-pressed, inside a named group.",
      "Each is read as its name and count; the colour is never the only cue, as the name is always shown.",
    ],
    related: ["icon-tiles", "chip-group"],
  },
  {
    slug: "searchable-list",
    title: "Searchable list",
    kind: "filter",
    description: "Search a long list and tick items and their sub-items, such as makes and models.",
    component: "SearchableList",
    entry: "registry/filters/searchable-list.tsx",
    example: "registry/examples/searchable-list.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "{ value: string; children: string[] }[]: one entry per ticked option, with the sub-options that narrow it. Empty children means the whole option. [] is no filter.",
    props: [
      { name: "options", type: "readonly { value: string; label: string; count: number; children?: { value: string; label: string; count: number }[] }[]", required: true, meaning: "In display order: the first collapsedCount make the short list, the rest show after \"All N\"." },
      { name: "value", type: "readonly { value: string; children: string[] }[]", required: true, meaning: "The ticked options and their ticked sub-options." },
      { name: "onChange", type: "(value: { value: string; children: string[] }[]) => void", required: true, meaning: "Called with the new picks." },
      { name: "label", type: "string", required: true, meaning: "Accessible name of the list." },
      { name: "noun", type: "string", default: "\"items\"", meaning: "Plural word for the options: \"Search makes\", \"All 21 makes\", \"No makes match\"." },
      { name: "collapsedCount", type: "number", default: "8", meaning: "How many options the short list shows." },
      { name: "formatCount", type: "(n: number) => string", default: "1,234", meaning: "Text in each count pill." },
      { name: "countLabel", type: "(n: number) => string", default: "\"6 results\"", meaning: "Screen-reader words for a count, e.g. \"6 cars\"." },
    ],
    does: [
      "Typing filters options and sub-options at once and marks the matching letters.",
      "Ticking an option opens its sub-options; ticking a sub-option narrows the option to it.",
      "The short list grows with what is ticked; \"All N\" shows the rest in a scroll area.",
      "A typo with no match offers the nearest name: \"Toyta\" gives \"Did you mean Toyota?\".",
      "A row with a count of 0 is dimmed and cannot be ticked.",
    ],
    keyboard: [
      "Tab moves from the search field through each checkbox, then to \"All N\".",
      "Space ticks the focused row; Escape in the search field clears it.",
    ],
    accessibility: [
      "Rows are native checkboxes; the whole row is the label and reads as name and count.",
      "Sub-options sit in their own list named after their option.",
      "\"No match\" and the suggestion are announced through a status region; \"All N\" has aria-expanded.",
    ],
    related: ["sentence-search", "chip-group", "icon-tiles"],
  },
  {
    slug: "sentence-search",
    title: "Sentence search",
    kind: "filter",
    card: false,
    description: "Type a sentence, such as \"blue suv under 30k\", and it turns into filters.",
    component: "SentenceSearch",
    entry: "registry/filters/sentence-search.tsx",
    example: "registry/examples/sentence-search.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "State: your own filters object. The vocabulary says how each word changes it, and which tokens it shows.",
    props: [
      { name: "vocabulary", type: "Vocabulary<Item, State>", required: true, meaning: "The words it knows: names (terms), phrases with numbers or meaning (rules), how to merge two values and the tokens a value shows." },
      { name: "items", type: "readonly Item[]", required: true, meaning: "Every item, for the result count and the count on each suggestion." },
      { name: "value", type: "State", required: true, meaning: "The filters that are set." },
      { name: "onChange", type: "(value: State) => void", required: true, meaning: "Called with the new filters when a token is added or removed." },
      { name: "label", type: "string", default: "\"Describe what you want\"", meaning: "Accessible name of the field, and the placeholder while nothing is set." },
      { name: "placeholder", type: "string", default: "the label", meaning: "Placeholder while nothing is set." },
      { name: "addPlaceholder", type: "string", default: "\"Add another filter\"", meaning: "Placeholder once a token is in the box." },
      { name: "submitLabel", type: "string", default: "\"Search\"", meaning: "The button that reads the whole sentence. It shows when the box is 480px or wider." },
      { name: "formatCount", type: "(n: number) => string", default: "1,234", meaning: "Text in each suggestion's count pill." },
      { name: "countLabel", type: "(n: number) => string", default: "\"6 results\"", meaning: "Words for a count, e.g. \"6 cars\": the result count under the suggestions, and each count read aloud." },
      { name: "defaultText / defaultOpen / autoFocus", type: "string / boolean / boolean", default: "\"\" / false / false", meaning: "Text in the field, open suggestions and focus on first render." },
    ],
    does: [
      "Reads a typed sentence into removable tokens: \"blue suv under 30k\" gives Blue, SUV and Under $30k.",
      "A word typed in full turns into a token on the space after it.",
      "Suggestions finish a half-typed name, offer the next filter, and show how many items each would leave.",
      "Fixes misspelt names: \"telsa\" is read as Tesla.",
      "When nothing matches, the first suggestion is the closest search that finds something.",
    ],
    keyboard: [
      "Up and Down move through the suggestions; Enter takes the highlighted one, or reads the whole sentence when the list is closed.",
      "Tab completes the highlighted suggestion while typing; Escape closes the list.",
      "Backspace in an empty field removes the last token; Shift+Tab reaches each token's remove button.",
    ],
    accessibility: [
      "The field is a combobox with a listbox popup: aria-expanded, aria-controls and aria-activedescendant follow the highlight, and every option has an id.",
      "Each token is a button named \"Remove SUV\".",
      "The result count is announced politely as it changes, as are the words it did not use.",
      "Focus is always visible; motion is skipped when reduced motion is asked for.",
    ],
    related: ["searchable-list", "chip-group", "icon-tiles"],
    connect:
      "The words live in a Vocabulary object: terms are the names it knows (each with a key, label, group, other names and how it adds itself to the value), rules are phrases with numbers or meaning (a RegExp and how it changes the value, read in order before any name), tokens(value) lists the removable tokens, merge adds one value to another, and matches(item, value) says whether an item passes. Ask me which fields my items have and where they come from. Then replace the example's vocabulary with my own: one term list per field, rules for my number phrases (prices, dates, sizes), the tokens and the matches test. Each term key must equal the key of the token it adds; the order of tokens and the suggestion rows rely on it. Optional parts: facets with firstUp and nextUp give the suggestions shown while the box is empty, numbers suggests for a typed number, filler lists words not worth reporting as unused, stopNames words that are never a name alone, and notTypos everyday words never fixed into a name. Keep components/filters-ui/lib/sentence.ts as it is: it knows no field names. Counts come from items and matches, so pass every item, not only the ones on screen.",
  },
  {
    slug: "range-histogram",
    title: "Price range",
    kind: "filter",
    description: "Pick a price range on a bar chart, with two handles and typed fields.",
    component: "RangeHistogram",
    entry: "registry/filters/range-histogram.tsx",
    example: "registry/examples/range-histogram.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "[number | null, number | null]: [low, high]. null is an open end, so [null, null] is no limit.",
    props: [
      { name: "min", type: "number", required: true, meaning: "Bottom of the scale." },
      { name: "max", type: "number", required: true, meaning: "Top of the scale. A high end here reads as no upper limit." },
      { name: "step", type: "number", required: true, meaning: "Handles and typed values snap to this." },
      { name: "value", type: "[number | null, number | null]", required: true, meaning: "The range. null is an open end." },
      { name: "onChange", type: "(value: [number | null, number | null]) => void", required: true, meaning: "Called with the new range." },
      ...RANGE_DATA,
      { name: "openLabel", type: "string", default: "max and \"+\"", meaning: "Tooltip text while the high end is open, e.g. \"$100,000+\"." },
      { name: "single", type: "boolean", default: "false", meaning: "One handle and one field, for an upper limit only." },
      { name: "placeholders", type: "{ low?: string; high?: string }", default: "Minimum, Maximum", meaning: "Field placeholders." },
      { name: "labels", type: "{ low?: string; high?: string }", default: "the placeholders", meaning: "Accessible names of the handles and fields, e.g. \"Lowest price\"." },
      ...RANGE_TAIL,
    ],
    does: [
      "Bars show how many items sit along the range; bars inside the range light up.",
      "Drag a handle, press a bar or the rail, or type a number: the chart and fields stay in step.",
      "Typed values accept \"45000\", \"45,000\", \"$45k\" or \"1.2m\" and snap outwards to the step.",
      "A handle at either end, or an empty field, leaves that end open.",
      "Handles never cross: each stops one step short of the other.",
    ],
    keyboard: [
      "Tab reaches each handle, then each field.",
      "Arrow keys move the focused handle by one step; Home and End jump to the ends.",
      "Enter or leaving a field applies what was typed; Escape puts the field back.",
    ],
    accessibility: [
      "Each handle is a native range input with its own name (\"Lowest price\") and a spoken value; an open end reads \"No minimum\" or \"No maximum\".",
      "The fields carry names even though only placeholders show.",
      "The tooltip and bars are hidden from screen readers; the inputs carry the meaning.",
    ],
    related: ["upper-limit", "range-select"],
  },
  {
    slug: "chip-group",
    title: "Chips",
    kind: "filter",
    description: "Turn on one or more chips, each with a count, such as fuel types.",
    component: "ChipGroup",
    entry: "registry/filters/chip-group.tsx",
    example: "registry/examples/chip-group.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "V[], where V is a string: the values that are on, in the order they were picked. [] is no filter.",
    props: [
      { name: "options", type: "readonly { value: V; label: string; count: number }[]", required: true, meaning: "The chips, in display order." },
      { name: "value", type: "readonly V[]", required: true, meaning: "The values that are on." },
      { name: "onChange", type: "(value: V[]) => void", required: true, meaning: "Called with the new list." },
      ...CHOICE_SHARED,
    ],
    does: [
      "Each chip toggles on or off; several can be on.",
      "Chips wrap onto as many rows as they need.",
      "A chip with a count of 0 is dimmed and cannot be turned on, but stays in place so the rows do not shift.",
      "A chip turned off at 0 keeps focus until you leave it.",
    ],
    keyboard: [
      "Each chip is a button: Tab moves between them, Space or Enter toggles.",
    ],
    accessibility: [
      "Chips are toggle buttons with aria-pressed, inside a named group.",
      "Each chip is read as its name and its count (\"Hybrid, 3 cars\").",
    ],
    related: ["icon-tiles", "color-swatches", "segmented-choice"],
  },
  {
    slug: "range-select",
    title: "Year range",
    kind: "filter",
    description: "Pick a range from a few set values, such as model years.",
    component: "RangeSelect",
    entry: "registry/filters/range-select.tsx",
    example: "registry/examples/range-select.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "[V | null, V | null], where V is a number from options: [from, to], both inclusive. null is an open end.",
    props: [
      { name: "options", type: "readonly number[]", required: true, meaning: "The values to pick from, in ascending order, e.g. years. One bar each." },
      { name: "value", type: "[V | null, V | null]", required: true, meaning: "[from, to], both inclusive. null is an open end." },
      { name: "onChange", type: "(value: [V | null, V | null]) => void", required: true, meaning: "Called with the new range." },
      { name: "buckets", type: "readonly number[]", meaning: "Item count per option, in the order of options." },
      { name: "format", type: "(value: V) => string", default: "String", meaning: "Picker, tooltip and screen-reader text for a value." },
      { name: "pickerOrder", type: "\"ascending\" | \"descending\"", default: "\"ascending\"", meaning: "Order of the picker choices; \"descending\" puts the newest year first." },
      { name: "anyLabel", type: "string", default: "\"Any\"", meaning: "The open-end choice in both pickers." },
      { name: "prefixes", type: "{ low?: string; high?: string }", default: "From, To", meaning: "Visible picker prefixes." },
      { name: "labels", type: "{ low?: string; high?: string }", default: "the prefixes", meaning: "Accessible names of the handles and pickers. Keep the prefix word in them." },
      { name: "barScale", type: "number", default: "1", meaning: "Bar width as a share of its slot." },
      { name: "disabled", type: "boolean", default: "false", meaning: "Dims the filter and blocks input." },
    ],
    does: [
      "One bar per value; the handles sit between bars, so From and To may hold the same value.",
      "The pickers and the chart stay in step both ways.",
      "Picking From past To moves To along with it, and the other way round: the latest pick wins.",
      "The first and last values are open ends, so choosing them sets no limit.",
    ],
    keyboard: [
      "Tab reaches each handle, then each picker.",
      "Arrow keys move the focused handle by one value.",
      "On a picker, Down, Enter or Space opens its list; arrows, Home, End and typed digits (\"2015\") move; Enter picks; Escape closes.",
    ],
    accessibility: [
      "Handles are native range inputs whose spoken value is the year, not a bar number.",
      "Each picker is a Select: a combobox with a listbox, named with its visible prefix (\"From year\").",
    ],
    related: ["range-histogram", "upper-limit"],
  },
  {
    slug: "upper-limit",
    title: "Upper limit",
    kind: "filter",
    description: "Set a top limit, such as kilometres driven.",
    component: "UpperLimit",
    entry: "registry/filters/upper-limit.tsx",
    example: "registry/examples/upper-limit.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "number | null: the limit, or null for none.",
    props: [
      { name: "min", type: "number", required: true, meaning: "Bottom of the scale. The handle stops one step above it." },
      { name: "max", type: "number", required: true, meaning: "Top of the scale. A limit here means no limit." },
      { name: "step", type: "number", required: true, meaning: "The handle and typed values snap to this." },
      { name: "value", type: "number | null", required: true, meaning: "The limit, or null for none." },
      { name: "onChange", type: "(value: number | null) => void", required: true, meaning: "Called with the new limit." },
      ...RANGE_DATA,
      { name: "openLabel", type: "string", default: "\"Any\"", meaning: "Tooltip text while there is no limit." },
      { name: "placeholder", type: "string", default: "\"Maximum\"", meaning: "Field placeholder." },
      { name: "label", type: "string", default: "the placeholder", meaning: "Accessible name of the handle and the field." },
      ...RANGE_TAIL,
    ],
    does: [
      "Bars below the limit light up; bars above it dim.",
      "Drag the handle, press a bar, or type a number: chart and field stay in step.",
      "A typed value snaps to the step and stays at least one step above min.",
      "The top of the scale, or an empty field, is no limit.",
    ],
    keyboard: [
      "Tab reaches the handle, then the field.",
      "Arrow keys move the handle by one step; Home and End jump to the ends.",
      "Enter or leaving the field applies what was typed; Escape puts it back.",
    ],
    accessibility: [
      "The handle is a native range input; with no limit it reads \"No maximum\".",
      "The field has a name of its own as well as its placeholder.",
    ],
    related: ["range-histogram", "range-select"],
  },
  {
    slug: "segmented-choice",
    title: "Segmented choice",
    kind: "filter",
    description: "Pick one option, or Any, with a count on each, such as 7+ seats.",
    component: "SegmentedChoice",
    entry: "registry/filters/segmented-choice.tsx",
    example: "registry/examples/segmented-choice.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "V, where V is string | number | null: the chosen option's value. null is the usual value for Any.",
    props: [
      { name: "options", type: "readonly { value: V; label: ReactNode; count?: number; disabled?: boolean }[]", required: true, meaning: "The choices. Leave count out for no pill, as on Any." },
      { name: "value", type: "V", required: true, meaning: "The chosen value." },
      { name: "onChange", type: "(value: V) => void", required: true, meaning: "Called with the new value." },
      ...CHOICE_SHARED,
      { name: "fit", type: "\"equal\" | \"content\"", default: "\"equal\"", meaning: "\"equal\": every option the same width. \"content\": an option whose words need more keeps its own width." },
      { name: "disabled", type: "boolean", default: "false", meaning: "Dims the control and blocks input." },
    ],
    does: [
      "Options share the width and one pill slides to the chosen one.",
      "An option whose count is 0 is dimmed and cannot be picked, unless it is the current choice.",
      "Works for \"at least\" scales (6+, 7+, 8+) and plain either-or choices (New or used, Manual or automatic).",
    ],
    keyboard: [
      "The group is one tab stop.",
      "Arrow keys, Home and End move and select at once, skipping disabled options.",
    ],
    accessibility: [
      "It is a radiogroup of radio buttons with aria-checked.",
      "Each count is read with its option (\"7+, 5 cars\"); the pill itself is hidden from screen readers.",
    ],
    related: ["chip-group", "icon-tiles"],
  },
  {
    slug: "dropdown",
    title: "Dropdown",
    kind: "basic",
    description: "A menu behind a small pill, such as \"Sort by Newest\", with one choice, several, or plain actions.",
    component: "DropdownMenu",
    entry: "registry/ui/dropdown-menu.tsx",
    example: "registry/examples/dropdown.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "V for one choice, or V[] with multiple, where V is a string: the chosen option values.",
    props: [
      { name: "label", type: "string", required: true, meaning: "Accessible name of the menu, e.g. \"Sort by\"." },
      { name: "options", type: "readonly (MenuOption<V> | { label?: string; options: MenuOption<V>[] })[]", required: true, meaning: "The choices: { value, label, disabled?, hint? }, plain or in labelled groups. A separator falls between groups." },
      { name: "value", type: "V, or readonly V[] with multiple", required: true, meaning: "The chosen value, or the ticked values." },
      { name: "onChange", type: "(value: V) => void, or (value: V[]) => void with multiple", required: true, meaning: "Called with the new choice. Ticked values come back in the order of the options." },
      { name: "multiple", type: "boolean", default: "false", meaning: "Tick boxes instead of one check; the menu stays open while ticking." },
      { name: "prefix", type: "string", meaning: "Muted words before the value on the trigger, e.g. \"Sort by\"." },
      { name: "actions", type: "readonly { label: string; onSelect: () => void; disabled?: boolean; hint?: string }[]", meaning: "Commands under the choices, after a separator." },
      { name: "variant", type: "\"filled\" | \"quiet\"", default: "\"filled\"", meaning: "\"quiet\" has no fill until hovered, for a toolbar or beside a result count." },
      { name: "align", type: "\"start\" | \"end\"", default: "\"start\"", meaning: "Which edge of the trigger the menu lines up with." },
      { name: "valueLabel / emptyLabel", type: "string / string", default: "the chosen labels / \"Any\"", meaning: "Trigger text instead of the chosen labels, and the text while nothing is ticked." },
      { name: "disabled", type: "boolean", default: "false", meaning: "Dims the trigger and blocks input." },
    ],
    does: [
      "The trigger reads as a phrase, \"Sort by Newest\", and its value swaps with a short blur as the choice changes.",
      "The menu opens on the page's top layer, so no card or scroll area clips it, and flips above the trigger when there is no room below.",
      "One choice shows a check and closes the menu; several choices show tick boxes and keep it open.",
      "A press outside closes it without moving focus; a finger has to tap, so starting a scroll keeps it open.",
    ],
    keyboard: [
      "Enter, Space or Down opens the menu on the chosen item; Up opens it on the last.",
      "Up and Down move and wrap; Home and End jump; typing a letter finds an item.",
      "Enter or Space picks; Escape closes and returns to the trigger; Tab closes and moves on.",
    ],
    accessibility: [
      "The trigger has aria-haspopup=\"menu\" and aria-expanded; the menu is role=\"menu\" with a name.",
      "Items are menuitemradio or menuitemcheckbox with aria-checked, or menuitem for actions; focus moves to each item itself.",
      "The highlight and the check are separate signals, and the highlight turns to the system colour in forced colours mode.",
    ],
    related: ["select", "buttons"],
    connect:
      "Ask me what the menu should change: a sort order, a view, or a set of columns. Keep the value in my own state and pass it with onChange, as the example does; for a sort, sort my items with it. Use multiple for several choices at once, and actions for commands such as Reset. Keep components/filters-ui/ui/popover.tsx as it is: it places the menu on the page's top layer (the popover API: Chrome 114, Safari 17, Firefox 125 or newer), so it is never clipped by a card or a scroll area.",
  },
  {
    slug: "select",
    title: "Select",
    kind: "basic",
    description: "A field that opens a list to pick one value from, drawn in the filters' own style.",
    component: "Select",
    entry: "registry/ui/select.tsx",
    example: "registry/examples/select.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "string: the chosen option's value. \"\" is the usual value for an empty choice such as Any.",
    props: [
      { name: "value", type: "string", required: true, meaning: "The chosen value. One that matches no option shows the empty look." },
      { name: "onChange", type: "(value: string) => void", required: true, meaning: "Called with the picked value." },
      { name: "options", type: "readonly { value: string; label: string; disabled?: boolean }[]", required: true, meaning: "The choices, in display order. A disabled one stays in place but cannot be picked." },
      { name: "label", type: "string", required: true, meaning: "Accessible name of the field and its list. Include the visible prefix (\"From year\" for \"From\")." },
      { name: "prefix", type: "ReactNode", meaning: "Muted text before the value, e.g. \"From\"." },
      { name: "placeholder", type: "string", default: "the label of the \"\" option", meaning: "Shown, muted, while no option matches value." },
      { name: "name", type: "string", meaning: "Sends the value with a form under this name." },
      { name: "disabled", type: "boolean", default: "false", meaning: "Dims the field and blocks input." },
    ],
    does: [
      "Looks like the text fields: 44px, a 1px border, the value after an optional prefix such as \"From\".",
      "The list opens on the page's top layer, so a card or a scroll area never clips it, at least as wide as the field.",
      "It opens on the chosen option, centred in the list, and flips above the field when there is no room below.",
      "One highlight slides between rows; the chosen option carries a check, so the two never get mixed up.",
    ],
    keyboard: [
      "Down, Up, Enter or Space opens the list; typing opens it on the first match.",
      "Up and Down move without wrapping; Home, End, Page Up and Page Down jump; typed letters or digits (\"2015\") find an option.",
      "Enter or Space picks; Escape closes without a change; Tab picks the option the keys moved to and moves on.",
    ],
    accessibility: [
      "The field is a button with role=\"combobox\", aria-expanded and aria-activedescendant; focus stays on it while the list is open.",
      "The list is a listbox of options with aria-selected on the chosen one and aria-disabled on the ones that cannot be picked.",
      "The visible prefix is hidden from screen readers; the label carries it.",
    ],
    related: ["dropdown", "range-select"],
    connect:
      "Ask me which value it picks and where the choices come from. Map them to { value, label } with string values, and add { value: \"\", label: \"Any\" } first when the choice can be left open. Keep the value in my own state. Keep components/filters-ui/ui/popover.tsx as it is: it places the list on the page's top layer (the popover API: Chrome 114, Safari 17, Firefox 125 or newer).",
  },
  {
    slug: "buttons",
    title: "Buttons and links",
    kind: "basic",
    description: "Buttons in five looks and three sizes, a busy state with a spinner, and links for text and navigation.",
    component: "Button",
    entry: "registry/ui/button.tsx",
    example: "registry/examples/buttons.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "None. Set busy while a request runs.",
    props: [
      { name: "variant", type: "\"primary\" | \"secondary\" | \"ghost\" | \"quiet\" | \"quiet-accent\"", default: "\"primary\"", meaning: "Accent fill, grey fill, no fill with a wash on hover, or muted text that lights up (accent text for quiet-accent)." },
      { name: "size", type: "\"sm\" | \"md\" | \"lg\"", default: "\"md\"", meaning: "32, 40 or 44px high. sm and md grow their tap area to 44px on touch screens." },
      { name: "before / after", type: "ReactNode", meaning: "An icon before or after the label, drawn in currentColor." },
      { name: "busy", type: "boolean", default: "false", meaning: "Presses do nothing; after 150ms a spinner takes the label's place for at least 400ms. The button keeps its focus and width." },
      { name: "IconButton label", type: "string", required: true, meaning: "IconButton: the accessible name of an icon-only button, e.g. \"Copy link\"." },
      { name: "TextLink variant", type: "\"inline\" | \"quiet\"", default: "\"inline\"", meaning: "TextLink: \"inline\" for a link in a sentence (accent, underlined), \"quiet\" for navigation (muted, no underline)." },
      { name: "TextLink arrow", type: "\"forward\" | \"back\"", meaning: "TextLink: a chevron that nudges 2px its way on hover." },
      { name: "buttonClasses / linkClasses", type: "(style) => string", meaning: "The same looks as class names (ui/button-classes.ts, ui/link.tsx), for a router link such as next/link, or a server component." },
    ],
    does: [
      "Primary, secondary, ghost and quiet looks in 32, 40 and 44px, all with 10px corners and the same press and focus ring.",
      "Busy never greys a button out: it keeps its colour, width and focus, ignores presses and swaps its label for a spinner.",
      "Inline links are always underlined, so colour is never their only mark; quiet links suit navigation and back links.",
      "A link that opens a new tab gets a small up-right arrow and says so to screen readers.",
    ],
    keyboard: [
      "Buttons and links are native: Tab reaches them, Enter or Space presses a button, Enter follows a link.",
      "A busy button keeps its place in the tab order.",
    ],
    accessibility: [
      "A busy button carries aria-busy and stays focusable; it is never disabled.",
      "IconButton requires a label; icons are hidden from screen readers.",
      "Focus shows a 2px outline that survives forced colours mode; filled buttons gain a border there.",
    ],
    related: ["dropdown", "select"],
    connect:
      "Ask me where these buttons and links go. Use Button for actions and set busy while a request runs; use TextLink, or linkClasses and buttonClasses on my router's link component (such as next/link), for anything that has a URL. An action with no URL stays a Button, never a link.",
  },
  {
    slug: "cars-board",
    title: "The full set",
    kind: "block",
    description: "All the filters on one board, with Clear all and a Show button.",
    component: "CarsBoard",
    entry: "registry/blocks/cars-board.tsx",
    example: "registry/examples/cars-board.tsx",
    addedIn: "1.0.0",
    updatedIn: "1.0.0",
    value: "The board keeps its own filters. onShow receives the matching cars.",
    props: [
      { name: "cars", type: "readonly Car[]", default: "256 sample cars", meaning: "The listings to filter." },
      { name: "defaultFilters", type: "CarFilters", default: "nothing set", meaning: "The filters on first render." },
      { name: "defaultOpen", type: "CarFacet[]", default: "[]", meaning: "Cards open on first render." },
      { name: "onShow", type: "(cars: Car[]) => void", meaning: "Called by Show N cars with the matching cars." },
      { name: "headingLevel", type: "1 | 2 | 3", default: "2", meaning: "Level of the Filters heading; card headings sit one below." },
    ],
    does: [
      "Eleven filters, each on its own card. Each count shows what picking that option would give.",
      "Clear on a card clears that filter; Clear all clears every one.",
      "Three columns, two from 640px, one on phones.",
      "On phones Clear all and Show move into a bar pinned to the bottom.",
    ],
    keyboard: [
      "Tab runs the head, then each column top to bottom.",
      "Each card head is a button: Enter or Space opens and closes it.",
    ],
    accessibility: [
      "The result count is announced politely as it changes.",
      "Each card head is a heading with an expanded state and a region for its body.",
      "A closed card's summary is read with its title.",
    ],
    related: ["range-histogram", "searchable-list", "icon-tiles"],
  },
];

export const itemBySlug = (slug: string) => ITEMS.find((item) => item.slug === slug);
