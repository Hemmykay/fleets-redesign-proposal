import katex from 'katex';

/**
 * Server-rendered LaTeX — katex.renderToString is pure string output (no
 * DOM), so this never needs 'use client' or hydration; the equation is
 * static HTML+CSS by the time it reaches the browser, same as any other
 * server component here.
 */
export default function Latex({
  tex,
  display = true,
}: {
  tex: string;
  display?: boolean;
}) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    // \htmlData is a trust-gated KaTeX command — safe here because every
    // tex string on this app is developer-authored (see app/latex/page.tsx),
    // never user input. Powers /latex's clickable-variable feature: each
    // named symbol is wrapped in \htmlData{v=KEY}{...}, and a click handler
    // on the container reads data-v back out via event delegation.
    trust: true,
  });
  return <span className={display ? 'latex-block' : 'latex-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}
