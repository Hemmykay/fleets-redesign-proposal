/** Shared term -> anchor-id slug, so /latex and /code-diff can link straight
 * into a specific /glossary entry (and back) without hardcoding ids twice. */
export function slugify(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
