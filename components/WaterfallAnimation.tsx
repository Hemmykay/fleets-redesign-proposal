'use client';

import { useState } from 'react';

const FFC_CAPACITY = 400_000;
const INSURANCE_CAPACITY = 60_000;
const FYC_CAPACITY = 600_000;
const MAX_LOSS = FFC_CAPACITY + INSURANCE_CAPACITY + FYC_CAPACITY + 100_000;

const PRESETS = [
  { label: 'Small loss', loss: 150_000 },
  { label: 'FFC exhausted', loss: 430_000 },
  { label: 'Insurance exhausted', loss: 480_000 },
  { label: 'Catastrophic', loss: 950_000 },
];

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

/** Interactive, animated walkthrough of the redesigned three-tier default
 * waterfall: FFC absorbs first, then insurance-held FYC burns (a real value
 * extraction — v_tranche AND total_supply drop), then only as a last resort
 * does general FYC take a hit. Drag the slider or pick a preset and watch
 * the loss cascade tier by tier, same order apply_default_waterfall applies
 * it in helpers/waterfall.rs. */
export default function WaterfallAnimation() {
  const [loss, setLoss] = useState(150_000);

  const ffcAbsorbed = Math.min(loss, FFC_CAPACITY);
  const remainingAfterFfc = Math.max(0, loss - FFC_CAPACITY);
  const insuranceAbsorbed = Math.min(remainingAfterFfc, INSURANCE_CAPACITY);
  const remainingAfterInsurance = Math.max(0, remainingAfterFfc - INSURANCE_CAPACITY);
  const fycAbsorbed = Math.min(remainingAfterInsurance, FYC_CAPACITY);
  const unabsorbed = Math.max(0, remainingAfterInsurance - FYC_CAPACITY);

  const tiers = [
    {
      key: 'ffc',
      label: '1. FFC v_tranche',
      sub: 'absorbs first, up to its full value',
      capacity: FFC_CAPACITY,
      absorbed: ffcAbsorbed,
      color: 'var(--ffc)',
    },
    {
      key: 'insurance',
      label: '2. Insurance-held FYC (burn)',
      sub: 'real extraction — v_tranche AND total_supply both drop',
      capacity: INSURANCE_CAPACITY,
      absorbed: insuranceAbsorbed,
      color: 'var(--warning)',
    },
    {
      key: 'fyc',
      label: '3. General FYC v_tranche',
      sub: 'only touched once both tiers above are exhausted',
      capacity: FYC_CAPACITY,
      absorbed: fycAbsorbed,
      color: 'var(--fyc)',
    },
  ];

  return (
    <div className="waterfall-anim">
      <div className="waterfall-controls">
        <div className="waterfall-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`waterfall-preset${loss === p.loss ? ' active' : ''}`}
              onClick={() => setLoss(p.loss)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="waterfall-slider-row">
          <input
            type="range"
            min={0}
            max={MAX_LOSS}
            step={10_000}
            value={loss}
            onChange={(e) => setLoss(Number(e.target.value))}
            aria-label="Gross loss amount"
          />
          <span className="waterfall-loss-label">Loss: {fmt(loss)}</span>
        </div>
      </div>

      <div className="waterfall-tiers">
        {tiers.map((t) => {
          const pct = t.capacity === 0 ? 0 : (t.absorbed / t.capacity) * 100;
          const exhausted = t.absorbed >= t.capacity && t.capacity > 0;
          return (
            <div key={t.key} className="waterfall-tier">
              <div className="waterfall-tier-label">
                <span>
                  <b>{t.label}</b>
                  <span className="waterfall-tier-sub"> — {t.sub}</span>
                </span>
                <span className="waterfall-tier-value">
                  {fmt(t.absorbed)} / {fmt(t.capacity)}
                </span>
              </div>
              <div className="waterfall-tier-track">
                <div
                  className="waterfall-tier-fill"
                  style={{ width: `${pct}%`, background: t.color }}
                />
              </div>
              {exhausted && <div className="waterfall-tier-flag">exhausted — cascades to the next tier</div>}
            </div>
          );
        })}
      </div>

      {unabsorbed > 0 && (
        <div className="waterfall-overflow">
          {fmt(unabsorbed)} of this loss exceeds all three tiers combined — beyond what this design absorbs today.
        </div>
      )}
    </div>
  );
}
