export type DiffRow =
  | { type: 'same'; l: string; r: string }
  | { type: 'del'; l: string; r: null }
  | { type: 'add'; l: null; r: string };

/** Classic LCS-based line diff — fine at this file size (a few hundred
 * lines at most), aligned so the two columns can render row-synced. */
export function diffLines(a: string[], b: string[]): DiffRow[] {
  const n = a.length;
  const m = b.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: 'same', l: a[i], r: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'del', l: a[i], r: null });
      i++;
    } else {
      rows.push({ type: 'add', l: null, r: b[j] });
      j++;
    }
  }
  while (i < n) {
    rows.push({ type: 'del', l: a[i], r: null });
    i++;
  }
  while (j < m) {
    rows.push({ type: 'add', l: null, r: b[j] });
    j++;
  }
  return rows;
}

const KEYWORDS =
  'fn|let|mut|pub|struct|impl|use|return|if|else|match|for|while|loop|in|as|const|static|crate|self|Self|enum|mod|where|dyn|unsafe|move|ref|trait|derive|repr|inline|cfg|test|super|from';
const TYPES =
  'u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|usize|isize|bool|str|Result|Option|Ok|Err|Some|None|Vec|ProgramError|AccountView|Seed|Signer|Clock|Sysvar|ProgramResult|Address|Pod|Zeroable|Debug|Clone|Copy|PartialEq|Eq';

const TOKEN_RE = new RegExp(
  '(//.*$)' +
    '|("(?:[^"\\\\]|\\\\.)*")' +
    '|(\\b\\d[\\d_]*(?:u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)?\\b)' +
    '|(\\b(?:' + KEYWORDS + ')\\b)' +
    '|(\\b(?:' + TYPES + ')\\b)' +
    '|(\\bFleetError::\\w+\\b)' +
    '|(#\\[[^\\]]*\\])',
  'g',
);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const NOTE_LINE_RE = /^\/\/[\/!]?\s?/;

/** For each line in a proposed file, find the explanatory comment block
 * that already precedes it (every `// NEW —` / `// CHANGED —` note authored
 * throughout files-data.ts) and attach it as that line's tooltip text — for
 * the comment lines themselves AND the contiguous run of code right below
 * them, up to the next blank line or comment. Reuses commentary that's
 * already there instead of hand-authoring a second copy per line. Lines
 * with no qualifying comment above them get `null` — no tooltip affordance. */
export function extractLineNotes(lines: string[]): (string | null)[] {
  const notes: (string | null)[] = new Array(lines.length).fill(null);
  let i = 0;
  while (i < lines.length) {
    if (NOTE_LINE_RE.test(lines[i].trim())) {
      const start = i;
      const parts: string[] = [];
      while (i < lines.length && NOTE_LINE_RE.test(lines[i].trim())) {
        parts.push(lines[i].trim().replace(NOTE_LINE_RE, ''));
        i++;
      }
      const text = parts.join(' ').replace(/\s+/g, ' ').trim();
      const isExplanatory = /^(NEW|CHANGED)\b/i.test(text) || text.length > 40;
      if (isExplanatory) {
        for (let j = start; j < i; j++) notes[j] = text;
        // A banner-style comment (e.g. a "--- Foo — NEW ... ---" block) is
        // often followed by ONE blank separator line before the actual
        // item — skip past it rather than stopping there, or the code the
        // comment is describing gets no tooltip at all.
        let k = i;
        while (k < lines.length && lines[k].trim() === '') k++;
        while (k < lines.length && lines[k].trim() !== '' && !NOTE_LINE_RE.test(lines[k].trim())) {
          notes[k] = text;
          k++;
        }
      }
      continue;
    }
    i++;
  }
  return notes;
}

/** Tiny regex-based Rust syntax highlighter — good enough for this diff
 * view, not a real tokenizer. Content is author-controlled (our own
 * proposed source), so returning an HTML string for dangerouslySetInnerHTML
 * is safe here. Emits fixed "tok-*" class names — these are declared
 * `:global()` in diff.module.css since CSS Modules can't scope class
 * names embedded in a raw HTML string. */
export function highlight(line: string): string {
  return esc(line).replace(
    TOKEN_RE,
    (m, cm, str, num, kw, ty, err, attr) => {
      if (cm) return '<span class="tok-c">' + m + '</span>';
      if (str) return '<span class="tok-s">' + m + '</span>';
      if (num) return '<span class="tok-n">' + m + '</span>';
      if (kw) return '<span class="tok-k">' + m + '</span>';
      if (ty) return '<span class="tok-t">' + m + '</span>';
      if (err) return '<span class="tok-fn">' + m + '</span>';
      if (attr) return '<span class="tok-macro">' + m + '</span>';
      return m;
    },
  );
}
