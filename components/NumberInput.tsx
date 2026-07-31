'use client';

import { useState } from 'react';

/** Strips everything except digits, a single leading minus, and a single
 * decimal point — this is the "parseable" form, no thousands separators. */
function sanitize(raw: string): string {
  let s = raw.replace(/[^0-9.-]/g, '');
  const negative = s.startsWith('-');
  s = s.replace(/-/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  return (negative ? '-' : '') + s;
}

/** Adds thousands separators to the integer part only — the decimal part
 * (if any) is left exactly as typed, so "1234.50" -> "1,234.50" but a
 * half-typed "1234." stays "1,234." rather than snapping to "1,234". */
function formatDisplay(sanitized: string): string {
  const negative = sanitized.startsWith('-');
  const body = negative ? sanitized.slice(1) : sanitized;
  const [intPart, decPart] = body.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-' : '') + withCommas + (decPart !== undefined ? '.' + decPart : '');
}

function countDigitsBefore(s: string, pos: number): number {
  let count = 0;
  for (let i = 0; i < pos && i < s.length; i++) {
    if (s[i] >= '0' && s[i] <= '9') count++;
  }
  return count;
}

function positionAfterDigits(s: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] >= '0' && s[i] <= '9') {
      count++;
      if (count === digitCount) return i + 1;
    }
  }
  return s.length;
}

/**
 * A comma-formatted numeric input — `type="number"` can never show "600,000"
 * (browsers reject non-digit characters in its value outright), so large
 * dollar figures render as an unbroken string of digits that's easy to
 * misread by an order of magnitude. This renders as `type="text"` instead,
 * reformatting with thousands separators on every keystroke while keeping
 * the caret in the same place relative to the surrounding digits (not just
 * pinned to the end), so typing in the middle of a number still works.
 *
 * The reformat + caret fix both happen synchronously inside the `onChange`
 * handler, on the DOM node directly (`e.target.value` / `setSelectionRange`)
 * rather than via a `text` state update applied in a later effect — an
 * effect-based version was tried first and works fine for a human typing
 * speed, but the caret restore landed one render behind under very fast
 * back-to-back synthetic keystrokes (e.g. an automated test typing a whole
 * number in one burst), corrupting later digits' insertion point. Mutating
 * the DOM eagerly removes that gap entirely: `setText` afterward is just to
 * keep React's own state consistent for the next render, not what the
 * caret position depends on.
 */
export function NumberInput({
  value,
  onChange,
  step,
  min,
  className,
  style,
  placeholder,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  id?: string;
}) {
  const [text, setText] = useState(() => formatDisplay(sanitize(String(value))));
  const [focused, setFocused] = useState(false);
  const [lastSyncedValue, setLastSyncedValue] = useState(value);

  // Keep displayed text in sync with an externally-changed value (e.g. a
  // paired slider) — but never while the user has this exact field focused,
  // or every keystroke would get clobbered by the reformat. Adjusted during
  // render (React's own "adjust state when a prop changes" pattern, using
  // state rather than a ref to track the last-seen value — refs can't be
  // read or written during render), not in an effect, so a slider drag
  // doesn't render once with stale text before catching up.
  if (!focused && lastSyncedValue !== value) {
    setLastSyncedValue(value);
    const next = formatDisplay(sanitize(String(value)));
    if (next !== text) setText(next);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      style={style}
      placeholder={placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(formatDisplay(sanitize(String(value))));
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * (step ?? 1);
        const next = value + delta;
        onChange(min !== undefined ? Math.max(min, next) : next);
      }}
      onChange={(e) => {
        const el = e.target;
        const rawBefore = el.value;
        const caretBefore = el.selectionStart ?? rawBefore.length;
        const digitsBeforeCaret = countDigitsBefore(rawBefore, caretBefore);

        const sanitized = sanitize(rawBefore);
        const formatted = formatDisplay(sanitized);
        const newCaret = positionAfterDigits(formatted, digitsBeforeCaret);

        // Fix the DOM synchronously, in this same event — see the note above
        // on why this can't wait for a state update + effect round-trip.
        el.value = formatted;
        el.setSelectionRange(newCaret, newCaret);
        setText(formatted);

        const parsed = Number(sanitized);
        if (sanitized !== '' && sanitized !== '-' && sanitized !== '.' && Number.isFinite(parsed)) {
          onChange(parsed);
        }
      }}
    />
  );
}
