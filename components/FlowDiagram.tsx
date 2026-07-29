const BOX_W = 285;
const BOX_H = 158;
const COL2_X = 375;
const ROW2_Y = 250;

const boxes = [
  { id: 'contract', x: 40, y: 40, w: BOX_W, h: BOX_H, title: 'Smart contract', sub: 'pinochio/src/', tone: 'fyc',
    lines: ['instructions/originate_loan.rs', 'instructions/repay_loan.rs', 'instructions/deposit.rs (+ mint gate)', 'state.rs — Pool/Tranche/Loan'] },
  { id: 'core', x: COL2_X, y: 40, w: BOX_W, h: BOX_H, title: 'fleet-core (new)', sub: 'shared Rust crate', tone: 'ffc',
    lines: ['coverage.rs — coverage, severity', 'curve.rs — k_base, k_final', 'gates.rs — origination, mint limiters', '#[cfg(feature="offchain")] helpers'] },
  { id: 'indexer', x: COL2_X, y: ROW2_Y, w: BOX_W, h: BOX_H, title: 'Off-chain indexer / API', sub: 'reads RPC, uses fleet-core', tone: 'neutral',
    lines: ['Poll Pool/Tranche/LoanAccount', 'Recompute coverage & severity', 'Serve /api/pool, /loans, /simulate', 'Same math as the program — no drift'] },
  { id: 'frontend', x: 40, y: ROW2_Y, w: BOX_W, h: BOX_H, title: 'Frontend', sub: "Next.js app (this app's pattern)", tone: 'neutral',
    lines: ['Borrower dashboard — true amortization', 'Pool dashboard — coverage/gates', 'Fetches precomputed values', 'Submits txs directly via wallet'] },
];

const DIAGRAM_W = COL2_X + BOX_W + 40; // right edge of the box grid + margin
const DIAGRAM_H = ROW2_Y + BOX_H + 24; // bottom edge of the box grid

const arrows: { num: number; label: string; path: string }[] = [
  { num: 1, label: 'on-chain program imports crate (no_std math)', path: `M${40 + BOX_W},110 L${COL2_X},110` },
  { num: 2, label: 'indexer imports same crate (offchain feature)', path: `M${COL2_X + BOX_W / 2},${40 + BOX_H} L${COL2_X + BOX_W / 2},${ROW2_Y}` },
  { num: 3, label: 'reads account state via RPC', path: `M${COL2_X},${ROW2_Y + 40} C 210,${ROW2_Y + 40} 100,${40 + BOX_H + 30} 100,${40 + BOX_H}` },
  { num: 4, label: 'REST/RPC — precomputed coverage, severity, projections', path: `M${COL2_X},${ROW2_Y + 90} L${40 + BOX_W},${ROW2_Y + 90}` },
  { num: 5, label: 'wallet-signed transactions (originate, repay, deposit)', path: `M120,${ROW2_Y} C 80,${ROW2_Y - 30} 60,${40 + BOX_H + 20} 60,${40 + BOX_H}` },
];

const LEGEND_TOP = DIAGRAM_H + 20;

export default function FlowDiagram() {
  const svgW = DIAGRAM_W + 20;
  const svgH = LEGEND_TOP + arrows.length * 20 + 10;
  return (
    <div className="chart-box">
      <svg className="flow-svg" viewBox={`0 0 ${svgW} ${svgH}`} style={{ minWidth: 640, width: '100%', height: 'auto' }}>
        <defs>
          <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--text-muted)" />
          </marker>
        </defs>

        {arrows.map((a) => (
          <path key={a.num} d={a.path} className="flow-arrow" />
        ))}

        {boxes.map((b) => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} className={`flow-box ${b.tone === 'fyc' ? 'fyc' : b.tone === 'ffc' ? 'ffc' : ''}`} />
            <text x={b.x + 14} y={b.y + 24} fontSize={13.5} fontWeight={600} fill="var(--text-primary)">
              {b.title}
            </text>
            <text x={b.x + 14} y={b.y + 41} fontSize={10} fill="var(--text-muted)">
              {b.sub}
            </text>
            {b.lines.map((l, i) => (
              <text key={i} x={b.x + 14} y={b.y + 66 + i * 19} fontSize={9.8} fill="var(--text-secondary)">
                {l}
              </text>
            ))}
          </g>
        ))}

        <line x1={40} y1={DIAGRAM_H} x2={DIAGRAM_W} y2={DIAGRAM_H} stroke="var(--border)" strokeWidth={1} />
        {arrows.map((a, i) => (
          <text key={'l' + a.num} x={40} y={LEGEND_TOP + i * 20} fontSize={10.5} fill="var(--text-secondary)" fontFamily="var(--font-mono)">
            <tspan fill="var(--text-muted)">{a.num}</tspan> {a.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
