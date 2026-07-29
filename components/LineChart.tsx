'use client';

import { useRef, useState } from 'react';

export interface Series {
  name: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
  area?: boolean;
  width?: number;
}

export interface VLine {
  x: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface HLine {
  y: number;
  label?: string;
  color?: string;
}

interface Props {
  series: Series[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: number[];
  yTicks: number[];
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  vLines?: VLine[];
  hLines?: HLine[];
  height?: number;
  xLabel?: string;
}

const W = 900;

function scale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

export default function LineChart({
  series,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  formatX = (v) => String(v),
  formatY = (v) => String(v),
  vLines = [],
  hLines = [],
  height = 340,
  xLabel,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; px: number } | null>(null);

  const M = { top: 16, right: 24, bottom: xLabel ? 46 : 32, left: 60 };
  const innerW = W - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const sx = scale(xDomain, [M.left, M.left + innerW]);
  const sy = scale(yDomain, [M.top + innerH, M.top]);

  function pathFor(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => (i === 0 ? 'M' : 'L') + sx(p.x) + ',' + sy(p.y)).join(' ');
  }
  function areaFor(pts: { x: number; y: number }[]) {
    const top = pathFor(pts);
    const base = `L${sx(pts[pts.length - 1].x)},${sy(yDomain[0])} L${sx(pts[0].x)},${sy(yDomain[0])} Z`;
    return top + ' ' + base;
  }

  function handleMove(ev: React.PointerEvent<SVGRectElement>) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const scaleX = W / box.width;
    const px = (ev.clientX - box.left) * scaleX;
    const xVal = (px - M.left) / innerW * (xDomain[1] - xDomain[0]) + xDomain[0];
    setHover({ x: Math.max(xDomain[0], Math.min(xDomain[1], xVal)), px });
  }

  // find nearest data x per series for tooltip
  function nearestY(pts: { x: number; y: number }[], xVal: number) {
    let best = pts[0];
    let bestD = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.x - xVal);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  return (
    <div className="chart-box chart-wrap-rel">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + innerW} y1={sy(v)} y2={sy(v)} className="grid-line" />
            <text x={M.left - 8} y={sy(v) + 3} className="axis-label" textAnchor="end">
              {formatY(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={sx(v)} y={M.top + innerH + 20} className="axis-label" textAnchor="middle">
            {formatX(v)}
          </text>
        ))}
        {xLabel && (
          <text x={M.left + innerW / 2} y={height - 6} className="axis-label" textAnchor="middle">
            {xLabel}
          </text>
        )}

        {hLines.map((h, i) => (
          <g key={i}>
            <line
              x1={M.left}
              x2={M.left + innerW}
              y1={sy(h.y)}
              y2={sy(h.y)}
              stroke={h.color ?? 'var(--text-muted)'}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.6}
            />
            {h.label && (
              <text x={M.left + 6} y={sy(h.y) - 6} className="axis-label">
                {h.label}
              </text>
            )}
          </g>
        ))}

        {vLines.map((v, i) => (
          <g key={i}>
            <line
              x1={sx(v.x)}
              x2={sx(v.x)}
              y1={M.top}
              y2={M.top + innerH}
              stroke={v.color ?? 'var(--warning)'}
              strokeWidth={1.2}
              strokeDasharray={v.dashed === false ? undefined : '3,3'}
              opacity={0.6}
            />
            {v.label && (
              <text x={sx(v.x) + 4} y={M.top + 12} className="axis-label" fill={v.color ?? 'var(--warning)'}>
                {v.label}
              </text>
            )}
          </g>
        ))}

        {series.map((s) =>
          s.area ? <path key={s.name + '-area'} d={areaFor(s.points)} fill={s.color} opacity={0.12} stroke="none" /> : null,
        )}
        {series.map((s) => (
          <path
            key={s.name}
            d={pathFor(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2.25}
            strokeDasharray={s.dashed ? '6,4' : undefined}
          />
        ))}

        {hover && (
          <line
            x1={sx(hover.x)}
            x2={sx(hover.x)}
            y1={M.top}
            y2={M.top + innerH}
            stroke="var(--text-muted)"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
        {hover &&
          series.map((s) => {
            const pt = nearestY(s.points, hover.x);
            return (
              <circle
                key={s.name + '-dot'}
                cx={sx(pt.x)}
                cy={sy(pt.y)}
                r={4.5}
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            );
          })}

        <rect
          x={M.left}
          y={M.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover && (
        <div
          className="tooltip"
          style={{
            opacity: 1,
            left: Math.min((sx(hover.x) / W) * 100, 78) + '%',
            top: 10,
          }}
        >
          <div className="t-head">{formatX(hover.x)}</div>
          {series.map((s) => {
            const pt = nearestY(s.points, hover.x);
            return (
              <div className="t-row" key={s.name}>
                <i style={{ background: s.color }} />
                {s.name}
                <b>{formatY(pt.y)}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
