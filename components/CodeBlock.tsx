'use client';

import { useState } from 'react';
import { highlightRust } from '@/lib/highlightRust';

/** Syntax-highlighted Rust snippet with a wrap toggle for lines that run
 * past the card's width — off by default (matches how the rest of the app's
 * code blocks behave, horizontal-scroll), on flips to pre-wrap. */
export default function CodeBlock({ code, fontSize = 12.3 }: { code: string; fontSize?: number }) {
  const [wrap, setWrap] = useState(false);
  return (
    <div className="code-block">
      <button
        type="button"
        className={`wrap-toggle${wrap ? ' active' : ''}`}
        onClick={() => setWrap((w) => !w)}
        title={wrap ? 'Switch back to horizontal scroll' : 'Wrap long lines instead of scrolling'}
      >
        {wrap ? '↵ Wrap: on' : '↵ Wrap: off'}
      </button>
      <div
        className={`formula${wrap ? ' wrap' : ''}`}
        style={{ fontSize }}
        dangerouslySetInnerHTML={{ __html: highlightRust(code) }}
      />
    </div>
  );
}
