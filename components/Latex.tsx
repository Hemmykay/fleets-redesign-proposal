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
  });
  return <span className={display ? 'latex-block' : 'latex-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}
