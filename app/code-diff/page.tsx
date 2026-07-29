'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui';
import { FILES } from './files-data';
import { diffLines, extractLineNotes, highlight } from './diff-utils';
import styles from './diff.module.css';

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

  const active = FILES[activeIdx];

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
    const right: { key: number; cls: string; num: number | null; html: string | null; note: string | null }[] = [];
    rows.forEach((row, idx) => {
      if (row.type === 'same') {
        ln++; rn++;
        left.push({ key: idx, cls: '', num: ln, html: highlight(row.l) });
        right.push({ key: idx, cls: '', num: rn, html: highlight(row.r), note: null });
      } else if (row.type === 'del') {
        ln++;
        left.push({ key: idx, cls: styles.rowDel, num: ln, html: highlight(row.l) });
        right.push({ key: idx, cls: styles.rowEmpty, num: null, html: null, note: null });
      } else {
        rn++;
        left.push({ key: idx, cls: styles.rowEmpty, num: null, html: null });
        right.push({ key: idx, cls: styles.rowAdd, num: rn, html: highlight(row.r), note: propNotes[rn - 1] });
      }
    });
    return { leftRows: left, rightRows: right, maxLines: Math.max(ln, rn) };
  }, [active]);

  const [openNotes, setOpenNotes] = useState<Set<number>>(new Set());
  useEffect(() => setOpenNotes(new Set()), [activeIdx]);
  const toggleNote = (key: number) =>
    setOpenNotes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const grouped = useMemo(() => {
    const g: Record<string, { file: (typeof FILES)[number]; idx: number }[]> = {};
    FILES.forEach((f, idx) => {
      const dir = f.path.split('/').slice(0, -1).join('/');
      (g[dir] ||= []).push({ file: f, idx });
    });
    return g;
  }, []);

  const modified = FILES.map((f, idx) => ({ f, idx })).filter((x) => x.f.status === 'M');
  const untracked = FILES.map((f, idx) => ({ f, idx })).filter((x) => x.f.status === 'U');

  return (
    <>
      <PageHeader
        eyebrow="pinochio / src — working tree"
        title="Code diff"
        lede={
          <>
            Every file from the real <code>protocol_monorepo/pinochio/</code> contract touched by this
            redesign, pulled straight from source and shown side by side with the proposed correction — plus
            one new file that doesn&rsquo;t exist yet. The left panel doubles as a <b>git status</b>: what
            needs updating, and what it originally looked like.
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
            <b>pinochio</b> — yield-distribution redesign — Visual Studio Code
          </span>
          {fullscreen && (
            <button className={styles.exitFsBtn} onClick={() => setFullscreen(false)}>
              ⤢ Exit Full Screen (Esc)
            </button>
          )}
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
              <span className={styles.badge}>{FILES.length}</span>
            </button>
          </div>

          <div className={styles.sidebar}>
            {view === 'explorer' ? (
              <>
                <div className={styles.sidebarTitle}>pinochio</div>
                <div className={styles.sidebarScroll}>
                  <div className={styles.treeFolder}>
                    <FolderIcon /> pinochio
                  </div>
                  <div className={`${styles.treeFolder} ${styles.indent1}`}>
                    <FolderIcon /> src
                  </div>
                  {(grouped['pinochio/src'] || []).map(({ file, idx }) => (
                    <FileRow key={file.path} file={file} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} indent={styles.indent2} />
                  ))}
                  <div className={`${styles.treeFolder} ${styles.indent2}`}>
                    <FolderIcon /> helpers
                  </div>
                  {(grouped['pinochio/src/helpers'] || []).map(({ file, idx }) => (
                    <FileRow key={file.path} file={file} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} indent={styles.indent2} deeper />
                  ))}
                  <div className={`${styles.treeFolder} ${styles.indent2}`}>
                    <FolderIcon /> instructions
                  </div>
                  {(grouped['pinochio/src/instructions'] || []).map(({ file, idx }) => (
                    <FileRow key={file.path} file={file} idx={idx} active={activeIdx === idx} onClick={setActiveIdx} indent={styles.indent2} deeper />
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
              {FILES.map((f, idx) => (
                <div
                  key={f.path}
                  className={`${styles.tab} ${statusClass(f.status)} ${idx === activeIdx ? styles.active : ''}`}
                  onClick={() => setActiveIdx(idx)}
                >
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
              <b>{active.status === 'U' ? 'New file. ' : 'Why: '}</b>
              {active.why}
            </div>

            <div className={styles.diffWrap}>
              <div className={styles.diffPane}>
                <div className={styles.paneHead}>
                  <span className={`${styles.paneTag} ${styles.paneTagOrig}`}>CURRENT</span>
                  {active.path}
                  {active.status === 'U' ? ' (does not exist)' : ''}
                </div>
                <div className={`${styles.paneCode} ${wrap ? styles.paneCodeWrap : ''}`}>
                  <table>
                    <tbody>
                      {leftRows.length === 0 ? (
                        <tr>
                          <td className={styles.numCell} />
                          <td className={styles.codeCell} style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            — file does not exist yet —
                          </td>
                        </tr>
                      ) : (
                        leftRows.map((row) => (
                          <tr key={row.key} className={row.cls}>
                            <td className={styles.numCell}>{row.num ?? ''}</td>
                            {row.html !== null ? (
                              <td className={styles.codeCell} dangerouslySetInnerHTML={{ __html: row.html }} />
                            ) : (
                              <td className={styles.codeCell} />
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles.diffPane}>
                <div className={styles.paneHead}>
                  <span className={`${styles.paneTag} ${styles.paneTagProp}`}>PROPOSED</span>
                  {active.path}
                </div>
                <div className={`${styles.paneCode} ${wrap ? styles.paneCodeWrap : ''}`}>
                  <table>
                    <tbody>
                      {rightRows.map((row) => {
                        const noted = row.cls === styles.rowAdd && !!row.note;
                        const open = noted && openNotes.has(row.key);
                        return (
                          <Fragment key={row.key}>
                            <tr
                              className={`${row.cls} ${noted ? styles.rowNoted : ''} ${open ? styles.rowNotedOpen : ''}`}
                              onClick={noted ? () => toggleNote(row.key) : undefined}
                              title={noted ? 'Click for an explanation of this change' : undefined}
                            >
                              <td className={styles.numCell}>{row.num ?? ''}</td>
                              {row.html !== null ? (
                                <td className={styles.codeCell} dangerouslySetInnerHTML={{ __html: row.html }} />
                              ) : (
                                <td className={styles.codeCell} />
                              )}
                            </tr>
                            {open && (
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
                                      onClick={() => toggleNote(row.key)}
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
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statusbar}>
          <div className={styles.statusItem}>⎇ redesign/yield-distribution</div>
          <div className={styles.statusItem}>{FILES.length} changes</div>
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
          <div className={styles.statusItem}>Rust</div>
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
      <span className={styles.fileName}>{file.path}</span>
      <span className={styles.fileStatus}>{file.status}</span>
    </div>
  );
}
