'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui';
import { FILES, type DiffFile } from './files-data';
import { diffLines, extractLineNotes, highlight } from './diff-utils';
import styles from './diff.module.css';

type Category = DiffFile['category'];
const CATEGORIES: Category[] = ['pinocchio', 'backend', 'frontend'];
const CATEGORY_LABEL: Record<Category, string> = { pinocchio: 'Pinocchio', backend: 'Backend', frontend: 'Frontend' };

const FileIcon = () => (
  <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);
const ExplorerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);
const ScmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="6" cy="6" r="2.3" />
    <circle cx="6" cy="18" r="2.3" />
    <circle cx="18" cy="12" r="2.3" />
    <path d="M6 8.3V15.7M8.2 6.5c4.5 0 7.5 2.3 7.5 5.5M8.2 17.5c4.5 0 7.5-2.3 7.5-5.5" />
  </svg>
);

function statusClass(s: 'M' | 'U') {
  return s === 'U' ? styles.untracked : styles.changed;
}

export default function CodeDiffPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [view, setView] = useState<'explorer' | 'scm'>('explorer');
  const [fullscreen, setFullscreen] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set(CATEGORIES));

  function toggleCategory(cat: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev; // never allow zero categories — nothing to show
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  // Resizable/collapsible CURRENT|PROPOSED split. leftWidthPct only applies
  // when neither pane is collapsed; a collapsed pane shrinks to a thin
  // clickable strip and the other one takes the rest.
  const [leftWidthPct, setLeftWidthPct] = useState(50);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const diffWrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current || !diffWrapRef.current) return;
      const rect = diffWrapRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.min(85, Math.max(15, pct)));
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Green dot = maximize, like the real macOS traffic light. Escape backs
  // out too, and the page itself stops scrolling behind the overlay while
  // it's up so it actually reads as "full screen," not just "taller."
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const visibleFiles = useMemo(
    () => FILES.map((f, idx) => ({ f, idx })).filter((x) => activeCategories.has(x.f.category)),
    [activeCategories],
  );

  // If the active file's category gets toggled off, fall back to the first
  // still-visible one rather than silently showing a hidden file. Adjusted
  // during render (React's documented alternative to an effect for this
  // exact case) — guarded so it only fires once per actual category change,
  // since visibleFiles[0].idx is itself category-filtered.
  if (!activeCategories.has(FILES[activeIdx].category) && visibleFiles[0] && visibleFiles[0].idx !== activeIdx) {
    setActiveIdx(visibleFiles[0].idx);
  }

  const active = FILES[activeIdx];

  const isNewFile = active.status === 'U';

  const { leftRows, rightRows, maxLines } = useMemo(() => {
    const origLines = active.original ? active.original.split('\n') : [];
    const propLines = active.proposed ? active.proposed.split('\n') : [];
    const propNotes = extractLineNotes(propLines);
    const rows =
      active.status === 'U'
        ? propLines.map((l) => ({ type: 'add' as const, l: null, r: l }))
        : diffLines(origLines, propLines);

    let ln = 0;
    let rn = 0;
    const left: { key: number; cls: string; num: number | null; html: string | null }[] = [];
    const right: {
      key: number;
      cls: string;
      num: number | null;
      html: string | null;
      note: string | null;
      groupKey: number | null;
      groupEnd: boolean;
    }[] = [];
    rows.forEach((row, idx) => {
      if (row.type === 'same') {
        ln++; rn++;
        left.push({ key: idx, cls: '', num: ln, html: highlight(row.l) });
        right.push({ key: idx, cls: '', num: rn, html: highlight(row.r), note: null, groupKey: null, groupEnd: false });
      } else if (row.type === 'del') {
        ln++;
        left.push({ key: idx, cls: styles.rowDel, num: ln, html: highlight(row.l) });
        right.push({ key: idx, cls: styles.rowEmpty, num: null, html: null, note: null, groupKey: null, groupEnd: false });
      } else {
        rn++;
        left.push({ key: idx, cls: styles.rowEmpty, num: null, html: null });
        right.push({ key: idx, cls: styles.rowAdd, num: rn, html: highlight(row.r), note: propNotes[rn - 1], groupKey: null, groupEnd: false });
      }
    });

    // Consecutive rows sharing the exact same note text belong to one
    // explanatory comment block — group them under one shared "what this
    // does" box (keyed on the group's first row) instead of repeating an
    // identical box after every single line in that block.
    for (let i = 0; i < right.length; i++) {
      if (!right[i].note) continue;
      let start = i;
      while (start > 0 && right[start - 1].note === right[i].note) start--;
      right[i].groupKey = right[start].key;
      const isLast = i === right.length - 1 || right[i + 1].note !== right[i].note;
      right[i].groupEnd = isLast;
    }

    return { leftRows: left, rightRows: right, maxLines: Math.max(ln, rn) };
  }, [active]);

  const [openNotes, setOpenNotes] = useState<Set<number>>(new Set());

  // Per-file suggestion box — deliberately its own Set, keyed on path rather
  // than the row-index groupKey openNotes uses, so this authored, file-level
  // mechanism never gets tangled with the derived, per-line note boxes above.
  const [openSuggestions, setOpenSuggestions] = useState<Set<string>>(new Set());

  // Both reset when the active file changes — adjusted during render (React's
  // documented alternative to an effect for this) rather than two separate
  // useEffects, guarded on a tracked "last seen" index so it fires exactly
  // once per actual navigation, not every render.
  const [notesResetIdx, setNotesResetIdx] = useState(activeIdx);
  if (activeIdx !== notesResetIdx) {
    setNotesResetIdx(activeIdx);
    setOpenNotes(new Set());
    setOpenSuggestions(new Set());
  }

  const toggleSuggestions = (path: string) => {
    setOpenSuggestions((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };
  const toggleNote = (groupKey: number) => {
    setOpenNotes((prev) => {
      const next = new Set(prev);
      const opening = !next.has(groupKey);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      if (opening) {
        // Jump the CURRENT pane to the same row position — the diff keeps
        // both panes index-aligned via empty-row padding, so "same row
        // index" is exactly "where this change relates to in the original,"
        // even when that's a gap (this is new content, nothing to point at).
        requestAnimationFrame(() => {
          document.getElementById(`left-row-${groupKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      return next;
    });
  };

  // Grouped by directory, then bucketed by category so the sidebar tree can
  // render one folder header per category instead of the old hardcoded
  // pinochio/src/{helpers,instructions} branches — generic enough for
  // whatever directory shape backend/frontend files bring with them.
  const dirsByCategory = useMemo(() => {
    const g: Record<string, { file: (typeof FILES)[number]; idx: number }[]> = {};
    visibleFiles.forEach(({ f, idx }) => {
      const dir = f.path.split('/').slice(0, -1).join('/');
      (g[dir] ||= []).push({ file: f, idx });
    });
    const byCat: Record<Category, string[]> = { pinocchio: [], backend: [], frontend: [] };
    Object.keys(g).forEach((dir) => byCat[g[dir][0].file.category].push(dir));
    (Object.keys(byCat) as Category[]).forEach((c) => byCat[c].sort());
    return { g, byCat };
  }, [visibleFiles]);

  const modified = visibleFiles.filter((x) => x.f.status === 'M');
  const untracked = visibleFiles.filter((x) => x.f.status === 'U');
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = { pinocchio: 0, backend: 0, frontend: 0 };
    FILES.forEach((f) => counts[f.category]++);
    return counts;
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="protocol_monorepo — working tree"
        title="Code diff"
        lede={
          <>
            Every file across <code>pinochio/</code>, <code>backend/</code>, and <code>frontend/</code> touched
            by this redesign, pulled straight from source and shown side by side with the proposed correction —
            plus new files that don&rsquo;t exist yet. Toggle <b>Show:</b> below to filter by part of the
            monorepo; each file with open follow-ups has its own <b>💡 suggestions</b> box, separate from the
            derived, click-a-line explanations inside the diff itself.
          </>
        }
      />

      <div className={`${styles.panel} ${fullscreen ? styles.fullscreenPanel : ''}`}>
        <div className={styles.titlebar}>
          <div className={styles.dots}>
            <span
              className={`${styles.dot} ${styles.dotR}`}
              role="button"
              tabIndex={0}
              title={fullscreen ? 'Exit Full Screen' : 'Close'}
              onClick={() => fullscreen && setFullscreen(false)}
            />
            <span className={`${styles.dot} ${styles.dotY}`} title="Minimize" />
            <span
              className={`${styles.dot} ${styles.dotG}`}
              role="button"
              tabIndex={0}
              title={fullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              onClick={() => setFullscreen((f) => !f)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFullscreen((f) => !f)}
            />
          </div>
          <span>
            <b>fleets</b> — protocol_monorepo — Visual Studio Code
          </span>
          {fullscreen && (
            <button className={styles.exitFsBtn} onClick={() => setFullscreen(false)}>
              ⤢ Exit Full Screen (Esc)
            </button>
          )}
        </div>

        <div className={styles.categoryBar}>
          <span className={styles.categoryBarLabel}>Show:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              data-cat={cat}
              className={`${styles.catPill} ${activeCategories.has(cat) ? styles.catPillActive : ''}`}
              onClick={() => toggleCategory(cat)}
              title={`Toggle ${CATEGORY_LABEL[cat]} files`}
            >
              <span className={styles.catDot} />
              {CATEGORY_LABEL[cat]} ({categoryCounts[cat]})
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <div className={styles.activity}>
            <button
              className={`${styles.activityBtn} ${view === 'explorer' ? styles.active : ''}`}
              onClick={() => setView('explorer')}
              title="Explorer"
            >
              <ExplorerIcon />
            </button>
            <button
              className={`${styles.activityBtn} ${view === 'scm' ? styles.active : ''}`}
              onClick={() => setView('scm')}
              title="Source Control"
              style={{ position: 'relative' }}
            >
              <ScmIcon />
              <span className={styles.badge}>{visibleFiles.length}</span>
            </button>
          </div>

          <div className={styles.sidebar}>
            {view === 'explorer' ? (
              <>
                <div className={styles.sidebarTitle}>working tree</div>
                <div className={styles.sidebarScroll}>
                  {CATEGORIES.filter((cat) => dirsByCategory.byCat[cat].length > 0).map((cat) => (
                    <div key={cat}>
                      <div className={styles.treeFolder}>
                        <FolderIcon /> {CATEGORY_LABEL[cat]}
                      </div>
                      {dirsByCategory.byCat[cat].map((dir) => (
                        <div key={dir}>
                          <div className={`${styles.treeFolder} ${styles.indent1}`}>
                            <FolderIcon /> {dir.split('/').slice(1).join('/') || dir}
                          </div>
                          {dirsByCategory.g[dir].map(({ file, idx }) => (
                            <FileRow key={file.path} file={file} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} indent={styles.indent2} deeper />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className={styles.sidebarTitle}>Source Control — pinochio</div>
                <div className={styles.scNote}>
                  Not a git repo — this mirrors <code>git status</code> for the design-session changes proposed
                  against the live contract.
                </div>
                <div className={styles.sidebarScroll}>
                  <div className={styles.scGroup}>
                    <span>Changes</span>
                    <span>{modified.length}</span>
                  </div>
                  {modified.map(({ f, idx }) => (
                    <ScRow key={f.path} file={f} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} />
                  ))}
                  <div className={styles.scGroup} style={{ marginTop: 8 }}>
                    <span>Untracked</span>
                    <span>{untracked.length}</span>
                  </div>
                  {untracked.map(({ f, idx }) => (
                    <ScRow key={f.path} file={f} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={styles.main}>
            <div className={styles.tabs}>
              {visibleFiles.map(({ f, idx }) => (
                <div
                  key={f.path}
                  className={`${styles.tab} ${statusClass(f.status)} ${idx === activeIdx ? styles.active : ''}`}
                  onClick={() => setActiveIdx(idx)}
                >
                  <span className={styles.catBadgeDot} data-cat={f.category} title={CATEGORY_LABEL[f.category]} />
                  <span className={styles.tname}>{f.path.split('/').pop()}</span>
                  <span className={styles.tabStatus}>{f.status}</span>
                </div>
              ))}
            </div>

            <div className={styles.breadcrumb}>
              {active.path.split('/').map((p, i, arr) => (
                <span key={i}>
                  {i > 0 && ' › '}
                  {i === arr.length - 1 ? <b>{p}</b> : p}
                </span>
              ))}
            </div>

            <div className={styles.why}>
              <span className={styles.whyText}>
                <b>{active.status === 'U' ? 'New file. ' : 'Why: '}</b>
                {active.why}
              </span>
              {active.suggestions && active.suggestions.length > 0 && (
                <button
                  type="button"
                  className={`${styles.suggestBtn} ${openSuggestions.has(active.path) ? styles.suggestBtnActive : ''}`}
                  onClick={() => toggleSuggestions(active.path)}
                >
                  💡 {active.suggestions.length} suggestion{active.suggestions.length === 1 ? '' : 's'}
                </button>
              )}
            </div>
            {active.suggestions && active.suggestions.length > 0 && openSuggestions.has(active.path) && (
              <div className={styles.suggestBox}>
                <div className={styles.suggestHead}>Open follow-ups for this file</div>
                <ul>
                  {active.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.diffWrap} ref={diffWrapRef}>
              {!isNewFile && (
                <>
                  <div
                    className={`${styles.diffPane} ${leftCollapsed ? styles.paneCollapsed : ''}`}
                    style={{ flex: rightCollapsed ? '1 1 auto' : leftCollapsed ? '0 0 34px' : `0 0 ${leftWidthPct}%` }}
                  >
                    <div className={styles.paneHead}>
                      <button
                        type="button"
                        className={styles.collapseBtn}
                        onClick={() => setLeftCollapsed((c) => !c)}
                        title={leftCollapsed ? 'Expand CURRENT' : 'Collapse CURRENT'}
                      >
                        {leftCollapsed ? '⟩' : '⟨'}
                      </button>
                      {!leftCollapsed && (
                        <>
                          <span className={`${styles.paneTag} ${styles.paneTagOrig}`}>CURRENT</span>
                          {active.path}
                        </>
                      )}
                    </div>
                    {leftCollapsed ? (
                      <div className={styles.paneCollapsedLabel} onClick={() => setLeftCollapsed(false)}>CURRENT</div>
                    ) : (
                      <div className={`${styles.paneCode} ${wrap ? styles.paneCodeWrap : ''}`}>
                        <table>
                          <tbody>
                            {leftRows.map((row) => (
                              <tr key={row.key} id={`left-row-${row.key}`} className={row.cls}>
                                <td className={styles.numCell}>{row.num ?? ''}</td>
                                {row.html !== null ? (
                                  <td className={styles.codeCell} dangerouslySetInnerHTML={{ __html: row.html }} />
                                ) : (
                                  <td className={styles.codeCell} />
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {!leftCollapsed && !rightCollapsed && (
                    <div
                      className={styles.divider}
                      onPointerDown={(e) => {
                        draggingRef.current = true;
                        e.preventDefault();
                      }}
                    />
                  )}
                </>
              )}
              <div
                className={`${styles.diffPane} ${rightCollapsed ? styles.paneCollapsed : ''}`}
                style={
                  isNewFile
                    ? { flex: '1 1 auto' }
                    : { flex: leftCollapsed ? '1 1 auto' : rightCollapsed ? '0 0 34px' : `0 0 ${100 - leftWidthPct}%` }
                }
              >
                <div className={styles.paneHead}>
                  {!isNewFile && (
                    <button
                      type="button"
                      className={styles.collapseBtn}
                      onClick={() => setRightCollapsed((c) => !c)}
                      title={rightCollapsed ? 'Expand PROPOSED' : 'Collapse PROPOSED'}
                    >
                      {rightCollapsed ? '⟨' : '⟩'}
                    </button>
                  )}
                  {!rightCollapsed && (
                    <>
                      <span className={`${styles.paneTag} ${styles.paneTagProp}`}>PROPOSED</span>
                      {active.path}
                    </>
                  )}
                </div>
                {rightCollapsed ? (
                  <div className={styles.paneCollapsedLabel} onClick={() => setRightCollapsed(false)}>PROPOSED</div>
                ) : (
                  <div className={`${styles.paneCode} ${wrap ? styles.paneCodeWrap : ''}`}>
                    <table>
                      <tbody>
                        {rightRows.map((row) => {
                          const noted = row.cls === styles.rowAdd && !!row.note;
                          const open = noted && row.groupKey !== null && openNotes.has(row.groupKey);
                          return (
                            <Fragment key={row.key}>
                              <tr
                                className={`${row.cls} ${noted ? styles.rowNoted : ''} ${open ? styles.rowNotedOpen : ''}`}
                                onClick={noted ? () => toggleNote(row.groupKey!) : undefined}
                                title={noted ? 'Click for an explanation of this change' : undefined}
                              >
                                <td className={styles.numCell}>{row.num ?? ''}</td>
                                {row.html !== null ? (
                                  <td className={styles.codeCell} dangerouslySetInnerHTML={{ __html: row.html }} />
                                ) : (
                                  <td className={styles.codeCell} />
                                )}
                              </tr>
                              {open && row.groupEnd && (
                                <tr className={styles.noteRow}>
                                  <td colSpan={2}>
                                    <div className={styles.noteBox}>
                                      <span>
                                        <b>What this does — </b>
                                        {row.note}
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.noteClose}
                                        onClick={() => toggleNote(row.groupKey!)}
                                        aria-label="Close explanation"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statusbar}>
          <div className={styles.statusItem}>⎇ redesign/yield-distribution</div>
          <div className={styles.statusItem}>{visibleFiles.length} of {FILES.length} changes</div>
          <div className={styles.sep} />
          <div className={styles.statusItem}>Ln {maxLines}, Col 1</div>
          <button
            type="button"
            className={`${styles.statusItem} ${styles.statusToggle} ${wrap ? styles.statusToggleActive : ''}`}
            onClick={() => setWrap((w) => !w)}
            title="Toggle word wrap for lines that run past the pane width"
          >
            {wrap ? '↵ Wrap: On' : 'Wrap: Off'}
          </button>
          <div className={styles.statusItem}>{active.category === 'pinocchio' ? 'Rust' : 'TypeScript'}</div>
          <div className={styles.statusItem}>UTF-8</div>
        </div>
      </div>
    </>
  );
}

function FileRow({
  file,
  idx,
  active,
  onClick,
  indent,
  deeper,
}: {
  file: (typeof FILES)[number];
  idx: number;
  active: boolean;
  onClick: (idx: number) => void;
  indent: string;
  deeper?: boolean;
}) {
  return (
    <div
      className={`${styles.fileRow} ${statusClass(file.status)} ${active ? styles.active : ''}`}
      style={{ paddingLeft: deeper ? 56 : undefined }}
      onClick={() => onClick(idx)}
    >
      <FileIcon />
      <span className={styles.catBadgeDot} data-cat={file.category} title={file.category} />
      <span className={styles.fileName}>{file.path.split('/').pop()}</span>
      <span className={styles.fileStatus}>{file.status}</span>
    </div>
  );
}

function ScRow({
  file,
  idx,
  active,
  onClick,
}: {
  file: (typeof FILES)[number];
  idx: number;
  active: boolean;
  onClick: (idx: number) => void;
}) {
  return (
    <div className={`${styles.fileRow} ${statusClass(file.status)} ${active ? styles.active : ''}`} onClick={() => onClick(idx)}>
      <FileIcon />
      <span className={styles.catBadgeDot} data-cat={file.category} title={file.category} />
      <span className={styles.fileName}>{file.path}</span>
      <span className={styles.fileStatus}>{file.status}</span>
    </div>
  );
}
