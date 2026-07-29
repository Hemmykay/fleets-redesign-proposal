/** Shared, monotonic id generator for simulator scenario rows (originations,
 * defaults, tranche activity) — one counter across the context's own
 * defaults and anything added later from app/simulator/page.tsx, so a
 * freshly-added row can never collide with an id handed out at init time.
 * Kept in its own module (not alongside a React component) so editing it
 * doesn't force Fast Refresh into a full-page reload. */
let idCounter = 1;
export function nextId(): string {
  return 'e' + idCounter++;
}
