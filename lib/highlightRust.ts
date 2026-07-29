const KEYWORDS =
  'fn|let|mut|pub|struct|impl|use|return|if|else|match|for|while|loop|in|as|const|static|crate|self|Self|enum|mod|where|dyn|unsafe|move|ref|trait|derive|repr|inline|cfg|test|super|from|require';
const TYPES =
  'u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|usize|isize|bool|str|Result|Option|Ok|Err|Some|None|Vec|ProgramError|AccountView|Seed|Signer|Clock|Sysvar|ProgramResult|Address|Pod|Zeroable|Debug|Clone|Copy|PartialEq|Eq';
/** ALL_CAPS_WITH_UNDERSCORES named constants (K_MIN_BPS, SEVERITY_REF) — a
 * 4-char minimum so common 3-letter finance acronyms (FYC, FFC, APY, APR,
 * TVL, BPS) that show up as plain prose don't get swept in. */
const CONSTANT = '[A-Z][A-Z0-9_]{3,}';
/** PascalCase identifiers (SeverityGate, LoanAccount, FleetError) — catches
 * custom struct/enum names the fixed TYPES list can't know about. Requires
 * a lowercase letter so it doesn't re-match CONSTANT above. */
const PASCAL_TYPE = '[A-Z][a-z]\\w*';

const TOKEN_RE = new RegExp(
  '(//.*$)' +
    '|("(?:[^"\\\\]|\\\\.)*")' +
    '|(\\b\\d[\\d_]*(?:u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)?%?\\b)' +
    '|(\\b(?:' + KEYWORDS + ')\\b)' +
    '|(\\b(?:' + TYPES + '|' + CONSTANT + '|' + PASCAL_TYPE + '|\\w+(?=::))\\b)' +
    '|(\\b[a-zA-Z_]\\w*\\b)(?=\\s*\\()' +
    '|(#\\[[^\\]]*\\])',
  'gm',
);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Small regex-based Rust/pseudocode syntax highlighter shared by every
 * code snippet in the app (the /implementation page's real Rust, and
 * /formula's pseudocode) — not a real tokenizer, just enough for
 * readability: comments, strings, numbers, keywords, types/constants, and
 * now function calls (`.fn`) get their own color, matching how VS Code
 * distinguishes a function name from a plain variable. Content is always
 * our own authored source, never user input, so returning an HTML string
 * for dangerouslySetInnerHTML is safe. */
export function highlightRust(code: string): string {
  return esc(code).replace(TOKEN_RE, (m, cm, str, num, kw, ty, fnCall, attr) => {
    if (cm) return '<span class="c">' + m + '</span>';
    if (str) return '<span class="s">' + m + '</span>';
    if (num) return '<span class="n">' + m + '</span>';
    if (kw) return '<span class="k">' + m + '</span>';
    if (ty) return '<span class="v">' + m + '</span>';
    if (fnCall) return '<span class="fn">' + m + '</span>';
    if (attr) return '<span class="c">' + m + '</span>';
    return m;
  });
}
