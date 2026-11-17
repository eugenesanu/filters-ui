/**
 * A slim scrollbar for every box that scrolls: a 6px rounded thumb in the line colour on a clear track, stronger under
 * the pointer, kept 2px off the side and 12px off each end so it never runs into a rounded corner.
 * Chromium and Safari draw it from the ::-webkit-scrollbar parts. Firefox has none of those, so it alone gets the
 * standard thin bar in the same colours: Chromium ignores the parts once scrollbar-width or scrollbar-color is set,
 * so never add either beside this class.
 */
export const SCROLL =
  "supports-[not(selector(::-webkit-scrollbar))]:[scrollbar-width:thin] supports-[not(selector(::-webkit-scrollbar))]:[scrollbar-color:var(--fu-line,#404040)_transparent] " +
  "[&::-webkit-scrollbar]:size-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent " +
  "[&::-webkit-scrollbar-track:vertical]:my-3 [&::-webkit-scrollbar-track:horizontal]:mx-3 " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding " +
  "[&::-webkit-scrollbar-thumb]:bg-[var(--fu-line,#404040)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--fu-control-border,#737373)] [&::-webkit-scrollbar-thumb:active]:bg-[var(--fu-control-border,#737373)]";
