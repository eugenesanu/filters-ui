/** A value worked out on first use and kept, for demo data too costly to build on every page that only imports its file. */
export function once<T>(make: () => T): () => T {
  let made: { value: T } | undefined;
  return () => (made ??= { value: make() }).value;
}
