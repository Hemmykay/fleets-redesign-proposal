'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import LineChart from '@/components/LineChart';
import { PageHeader, Card, Readout, Pill, Callout, Collapsible } from '@/components/ui';
import { runSimulation, type OriginationEvent, type DefaultEvent, type TrancheActivityEvent } from '@/lib/simulate';
import { generateRandomOriginations, generateRandomTrancheActivity } from '@/lib/random';
import { fmtUSD } from '@/lib/model';
import { useSeverityGate } from '@/components/SeverityGateContext';

let idCounter = 1;
function nextId() {
  return 'e' + idCounter++;
}

const DEFAULT_ORIGINATIONS: OriginationEvent[] = [
  { id: nextId(), period: 1, amount: 450000, apr: 0.08, termMonths: 36 },
];
const DEFAULT_DEFAULTS: DefaultEvent[] = [];
const DEFAULT_ACTIVITY: TrancheActivityEvent[] = [];

export default function SimulatorPage() {
  const [initialFyc, setInitialFyc] = useState(600000);
  const [initialFfc, setInitialFfc] = useState(400000);
  const [reserveApy, setReserveApy] = useState(0.028);
  const [periods, setPeriods] = useState(36);
  const [originations, setOriginations] = useState<OriginationEvent[]>(DEFAULT_ORIGINATIONS);
  const [defaults, setDefaults] = useState<DefaultEvent[]>(DEFAULT_DEFAULTS);
  // Shared with /explorer's "Severity gate (origination)" slider — set it
  // there, it carries through to this run too.
  const { severityGateMax, setSeverityGateMax } = useSeverityGate();
  const severityGateFraction = severityGateMax / 100;

  const [randomMode, setRandomMode] = useState(false);
  const [randomSeed, setRandomSeed] = useState(1);
  const [randomAprMin, setRandomAprMin] = useState(0.15);
  const [randomAprMax, setRandomAprMax] = useState(0.18);
  const [randomAmountMin, setRandomAmountMin] = useState(50000);
  const [randomAmountMax, setRandomAmountMax] = useState(200000);
  const [randomFrequency, setRandomFrequency] = useState(3);
  const [randomTermMonths, setRandomTermMonths] = useState(24);

  const [trancheActivity, setTrancheActivity] = useState<TrancheActivityEvent[]>(DEFAULT_ACTIVITY);
  const [randomActivityMode, setRandomActivityMode] = useState(false);
  const [randomActivitySeed, setRandomActivitySeed] = useState(1);
  const [randomActivityFrequency, setRandomActivityFrequency] = useState(4);
  const [randomActivityAmountMin, setRandomActivityAmountMin] = useState(20000);
  const [randomActivityAmountMax, setRandomActivityAmountMax] = useState(120000);
  const [randomActivityRedeemFraction, setRandomActivityRedeemFraction] = useState(0.3);
  const [randomActivityFfcFraction, setRandomActivityFfcFraction] = useState(0.5);

  const [cursor, setCursor] = useState(0);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const randomOriginations = useMemo(
    () =>
      generateRandomOriginations({
        seed: randomSeed,
        periods,
        frequency: randomFrequency,
        aprMin: randomAprMin,
        aprMax: randomAprMax,
        amountMin: randomAmountMin,
        amountMax: randomAmountMax,
        termMonths: randomTermMonths,
      }),
    [randomSeed, periods, randomFrequency, randomAprMin, randomAprMax, randomAmountMin, randomAmountMax, randomTermMonths],
  );
  const effectiveOriginations = randomMode ? randomOriginations : originations;

  const randomTrancheActivity = useMemo(
    () =>
      generateRandomTrancheActivity({
        seed: randomActivitySeed,
        periods,
        frequency: randomActivityFrequency,
        amountMin: randomActivityAmountMin,
        amountMax: randomActivityAmountMax,
        redeemFraction: randomActivityRedeemFraction,
        ffcFraction: randomActivityFfcFraction,
      }),
    [randomActivitySeed, periods, randomActivityFrequency, randomActivityAmountMin, randomActivityAmountMax, randomActivityRedeemFraction, randomActivityFfcFraction],
  );
  const effectiveTrancheActivity = randomActivityMode ? randomTrancheActivity : trancheActivity;

  // Always run long enough for the last loan to fully amortize to $0 — a loan
  // originated late with a long term must not get cut off mid-schedule just
  // because "periods to simulate" was set shorter. New originations are still
  // only ever scheduled within the user's stated window (see `periods` above,
  // which bounds generateRandomOriginations); only the run LENGTH extends.
  const lastLoanCompletion = effectiveOriginations.reduce(
    (max, o) => Math.max(max, o.period + o.termMonths),
    periods,
  );
  const effectivePeriods = Math.max(periods, lastLoanCompletion);

  const result = useMemo(
    () =>
      runSimulation({
        initialFyc,
        initialFfc,
        reserveApy,
        periods: effectivePeriods,
        originations: effectiveOriginations,
        defaults,
        trancheActivity: effectiveTrancheActivity,
        severityGateMax: severityGateFraction,
      }),
    [initialFyc, initialFfc, reserveApy, effectivePeriods, effectiveOriginations, defaults, effectiveTrancheActivity, severityGateFraction],
  );

  useEffect(() => {
    setCursor((c) => Math.min(c, effectivePeriods));
  }, [effectivePeriods]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setCursor((c) => {
          if (c >= effectivePeriods) {
            setPlaying(false);
            return c;
          }
          return c + 1;
        });
      }, 260);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, effectivePeriods]);

  const step = result.steps[cursor] ?? result.steps[result.steps.length - 1];
  const eventsAtCursor = result.events.filter((e) => e.period === cursor);

  function addOrigination() {
    setOriginations((prev) => [...prev, { id: nextId(), period: 1, amount: 100000, apr: 0.08, termMonths: 36 }]);
  }
  function addDefault() {
    setDefaults((prev) => [...prev, { id: nextId(), period: 6, lossAmount: 50000 }]);
  }
  function addActivity() {
    setTrancheActivity((prev) => [...prev, { id: nextId(), period: 3, tranche: 'fyc', kind: 'mint', amount: 100000 }]);
  }

  const maxBalance = Math.max(initialFyc, initialFfc, ...result.steps.map((s) => Math.max(s.fyc, s.ffc)));
  const maxPct = Math.max(60, ...result.steps.map((s) => Math.max(s.coveragePct, s.severity * 100)));
  const maxApy = Math.max(10, ...result.steps.map((s) => Math.max(s.fycApyAnnualized, s.ffcApyAnnualized)));
  const maxPrice = Math.max(1.1, ...result.steps.map((s) => Math.max(s.fycPrice, s.ffcPrice))) * 1.05;
  const minPrice = Math.min(0.9, ...result.steps.map((s) => Math.min(s.fycPrice, s.ffcPrice))) * 0.98;

  return (
    <>
      <PageHeader
        eyebrow="simulator"
        title="Scenario simulator"
        lede="Set every variable and run a genuine multi-period simulation — one period = one 30-day repayment cycle, matching SECONDS_PER_PERIOD in the real contract. Originations are gated on severity, defaults hit FFC first, reserve yield splits pro-rata, loan interest runs through the full severity-scaled curve. Nothing here is hand-waved — it's the same lib/model.ts every other page uses."
      />

      <Card>
        <h3>Starting pool</h3>
        <div className="grid-2">
          <NumberField label="Initial FYC (senior)" value={initialFyc} onChange={setInitialFyc} step={10000} prefix="$" />
          <NumberField label="Initial FFC (junior)" value={initialFfc} onChange={setInitialFfc} step={10000} prefix="$" />
          <NumberField label="Reserve/USDY APY (true rate)" value={reserveApy * 100} onChange={(v) => setReserveApy(v / 100)} step={0.1} suffix="%" />
          <NumberField label="Periods to simulate (minimum)" value={periods} onChange={(v) => setPeriods(Math.max(1, Math.min(120, Math.round(v))))} step={1} />
          <NumberField
            label="Severity gate (origination)"
            value={severityGateMax}
            onChange={(v) => setSeverityGateMax(Math.max(0, Math.min(100, v)))}
            step={1}
            suffix="%"
          />
        </div>
        <p className="section-dek" style={{ fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
          Also the window new originations can land in. The run itself always goes at least this long, and
          automatically longer if needed — see below. The severity gate is shared with{' '}
          <Link href="/explorer">Coverage &amp; curve</Link> — changing it here changes it there too.
        </p>
      </Card>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Loan originations</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={randomMode} onChange={(e) => setRandomMode(e.target.checked)} />
              randomize
            </label>
          </div>
          <p className="section-dek" style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>
            Each is checked against the severity gate ({severityGateMax}% — set above, or on{' '}
            <Link href="/explorer">Coverage &amp; curve</Link>; it&rsquo;s the same shared value either way) when
            its period arrives — a blocked origination shows up in the event log, not silently skipped.
          </p>

          {!randomMode ? (
            <>
              {originations.map((o) => (
                <EventRow key={o.id} onRemove={() => setOriginations((prev) => prev.filter((x) => x.id !== o.id))}>
                  <MiniField label="period" value={o.period} onChange={(v) => updateOrig(setOriginations, o.id, { period: v })} />
                  <MiniField label="amount $" value={o.amount} onChange={(v) => updateOrig(setOriginations, o.id, { amount: v })} step={5000} />
                  <MiniField label="apr %" value={o.apr * 100} onChange={(v) => updateOrig(setOriginations, o.id, { apr: v / 100 })} step={0.5} />
                  <MiniField label="term (mo)" value={o.termMonths} onChange={(v) => updateOrig(setOriginations, o.id, { termMonths: Math.round(v) })} step={1} />
                </EventRow>
              ))}
              <button className="pill neutral" style={{ cursor: 'pointer', border: 'none', marginTop: 8 }} onClick={addOrigination}>
                + add origination
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <MiniField label="apr min %" value={randomAprMin * 100} onChange={(v) => setRandomAprMin(v / 100)} step={0.5} />
                <MiniField label="apr max %" value={randomAprMax * 100} onChange={(v) => setRandomAprMax(v / 100)} step={0.5} />
                <MiniField label="amount min $" value={randomAmountMin} onChange={setRandomAmountMin} step={10000} />
                <MiniField label="amount max $" value={randomAmountMax} onChange={setRandomAmountMax} step={10000} />
                <MiniField label="every ~N periods" value={randomFrequency} onChange={(v) => setRandomFrequency(Math.max(1, Math.round(v)))} step={1} />
                <MiniField label="term (mo)" value={randomTermMonths} onChange={(v) => setRandomTermMonths(Math.max(1, Math.round(v)))} step={1} />
              </div>
              <button
                className="pill neutral"
                style={{ cursor: 'pointer', border: 'none', marginBottom: 10 }}
                onClick={() => setRandomSeed((s) => s + 1)}
              >
                🎲 reroll (seed {randomSeed})
              </button>
              <p className="section-dek" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {randomOriginations.length} loan{randomOriginations.length === 1 ? '' : 's'} generated, APR{' '}
                {(randomAprMin * 100).toFixed(1)}%–{(randomAprMax * 100).toFixed(1)}%. Deterministic per seed — scrubbing
                the playhead won&rsquo;t reshuffle it, only &ldquo;reroll&rdquo; will.
              </p>
              <div style={{ maxHeight: 140, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                {randomOriginations.map((o) => (
                  <div key={o.id} style={{ display: 'flex', gap: 10, padding: '3px 0' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>p{o.period}</span>
                    <span>{fmtUSD(o.amount)}</span>
                    <span>{(o.apr * 100).toFixed(2)}% APR</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card>
          <h3>Default events</h3>
          <p className="section-dek" style={{ fontSize: 12, marginBottom: 10 }}>
            A dollar amount of the loan book written off at a given period. FFC absorbs first, up to its full
            value; FYC absorbs any remainder.
          </p>
          {defaults.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No defaults configured — a clean run.</p>}
          {defaults.map((d) => (
            <EventRow key={d.id} onRemove={() => setDefaults((prev) => prev.filter((x) => x.id !== d.id))}>
              <MiniField label="period" value={d.period} onChange={(v) => updateDef(setDefaults, d.id, { period: v })} />
              <MiniField label="loss $" value={d.lossAmount} onChange={(v) => updateDef(setDefaults, d.id, { lossAmount: v })} step={5000} />
            </EventRow>
          ))}
          <button className="pill neutral" style={{ cursor: 'pointer', border: 'none', marginTop: 8 }} onClick={addDefault}>
            + add default
          </button>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>FYC / FFC activity</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={randomActivityMode} onChange={(e) => setRandomActivityMode(e.target.checked)} />
            randomize
          </label>
        </div>
        <p className="section-dek" style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>
          Deposits (mint) and withdrawals (redeem) against either tranche — same mechanism as loan
          originations, generated the same way. FFC mints are checked against the mint floor when their period
          arrives; a blocked mint shows up in the event log, same as a blocked origination. Priced at this
          model&rsquo;s single v_tranche/supply price — the real contract mints at the optimistic price and
          redeems at the conservative one, which this simplified model doesn&rsquo;t distinguish.
        </p>

        {!randomActivityMode ? (
          <>
            {trancheActivity.map((a) => (
              <EventRow key={a.id} onRemove={() => setTrancheActivity((prev) => prev.filter((x) => x.id !== a.id))}>
                <MiniField label="period" value={a.period} onChange={(v) => updateActivity(setTrancheActivity, a.id, { period: v })} />
                <MiniSelect
                  label="tranche"
                  value={a.tranche}
                  options={[{ value: 'fyc', label: 'FYC' }, { value: 'ffc', label: 'FFC' }]}
                  onChange={(v) => updateActivity(setTrancheActivity, a.id, { tranche: v as 'fyc' | 'ffc' })}
                />
                <MiniSelect
                  label="kind"
                  value={a.kind}
                  options={[{ value: 'mint', label: 'mint' }, { value: 'redeem', label: 'redeem' }]}
                  onChange={(v) => updateActivity(setTrancheActivity, a.id, { kind: v as 'mint' | 'redeem' })}
                />
                <MiniField label="amount $" value={a.amount} onChange={(v) => updateActivity(setTrancheActivity, a.id, { amount: v })} step={5000} />
              </EventRow>
            ))}
            <button className="pill neutral" style={{ cursor: 'pointer', border: 'none', marginTop: 8 }} onClick={addActivity}>
              + add mint/redeem
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <MiniField label="amount min $" value={randomActivityAmountMin} onChange={setRandomActivityAmountMin} step={10000} />
              <MiniField label="amount max $" value={randomActivityAmountMax} onChange={setRandomActivityAmountMax} step={10000} />
              <MiniField label="every ~N periods" value={randomActivityFrequency} onChange={(v) => setRandomActivityFrequency(Math.max(1, Math.round(v)))} step={1} />
              <MiniField label="redeem share (0-1)" value={randomActivityRedeemFraction} onChange={(v) => setRandomActivityRedeemFraction(Math.max(0, Math.min(1, v)))} step={0.1} />
              <MiniField label="FFC share (0-1)" value={randomActivityFfcFraction} onChange={(v) => setRandomActivityFfcFraction(Math.max(0, Math.min(1, v)))} step={0.1} />
            </div>
            <button
              className="pill neutral"
              style={{ cursor: 'pointer', border: 'none', marginBottom: 10 }}
              onClick={() => setRandomActivitySeed((s) => s + 1)}
            >
              🎲 reroll (seed {randomActivitySeed})
            </button>
            <p className="section-dek" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {randomTrancheActivity.length} event{randomTrancheActivity.length === 1 ? '' : 's'} generated.
              Deterministic per seed — scrubbing the playhead won&rsquo;t reshuffle it, only &ldquo;reroll&rdquo; will.
            </p>
            <div style={{ maxHeight: 140, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-secondary)' }}>
              {randomTrancheActivity.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '3px 0' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>p{a.period}</span>
                  <span style={{ color: a.tranche === 'fyc' ? 'var(--fyc)' : 'var(--ffc)', minWidth: 32 }}>{a.tranche.toUpperCase()}</span>
                  <span>{a.kind}</span>
                  <span>{fmtUSD(a.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Playback — period {cursor} of {effectivePeriods}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="pill good"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => {
                if (cursor >= effectivePeriods) setCursor(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? '⏸ pause' : '▶ play'}
            </button>
            <button className="pill neutral" style={{ cursor: 'pointer', border: 'none' }} onClick={() => { setPlaying(false); setCursor(0); }}>
              ↺ reset
            </button>
          </div>
        </div>
        {effectivePeriods > periods && (
          <p className="section-dek" style={{ fontSize: 11.5, color: 'var(--warning)', marginTop: 0, marginBottom: 10 }}>
            Extended from {periods} to {effectivePeriods} periods — the last loan (originated period{' '}
            {effectiveOriginations.reduce((best, o) => (o.period + o.termMonths > best.period + best.termMonths ? o : best), effectiveOriginations[0])?.period}
            , {effectiveOriginations.reduce((best, o) => (o.period + o.termMonths > best.period + best.termMonths ? o : best), effectiveOriginations[0])?.termMonths}-month term) needs to fully amortize to $0.
          </p>
        )}
        <input
          type="range"
          min={0}
          max={effectivePeriods}
          step={1}
          value={cursor}
          onChange={(e) => {
            setPlaying(false);
            setCursor(+e.target.value);
          }}
        />

        <div className="readout-grid" style={{ marginTop: 16, marginBottom: 16 }}>
          <Readout label="FYC value / price" value={`${fmtUSD(step.fyc)} · $${step.fycPrice.toFixed(4)}`} sub={`${step.fycApyAnnualized.toFixed(2)}% annualized this period · ${Math.round(step.fycSupply).toLocaleString()} tokens`} color="var(--fyc)" />
          <Readout label="FFC value / price" value={`${fmtUSD(step.ffc)} · $${step.ffcPrice.toFixed(4)}`} sub={`${step.ffcApyAnnualized.toFixed(2)}% annualized this period · ${Math.round(step.ffcSupply).toLocaleString()} tokens`} color="var(--ffc)" />
          <Readout label="Outstanding / active loans" value={fmtUSD(step.outstanding)} sub={`${step.activeLoanCount} active loan(s)`} />
          <Readout label="Coverage / severity" value={`${step.coveragePct.toFixed(1)}% / ${(step.severity * 100).toFixed(2)}%`} sub={`k = ${step.k.toFixed(2)}×`} />
          <Readout
            label="Reserve APY — observed / true"
            value={`${step.reserveObservedApyPct.toFixed(3)}% / ${(reserveApy * 100).toFixed(2)}%`}
            sub={`reserve price $${step.reservePrice.toFixed(4)} · derived via the same price-delta formula as observed_source_apy_bps`}
          />
          <Readout
            label="Loan book APY — blended"
            value={`${step.loanObservedApyPct.toFixed(2)}%`}
            sub="realized rate across all active loans right now, not any single loan's own APR"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {step.defaultLoss > 0 && <Pill tone="bad">default this period: {fmtUSD(step.defaultLoss)}</Pill>}
          {eventsAtCursor.map((e, i) => (
            <Pill
              key={i}
              tone={
                e.kind === 'origination-blocked' || e.kind === 'mint-blocked'
                  ? 'bad'
                  : e.kind === 'origination' || e.kind === 'mint'
                    ? 'good'
                    : 'neutral'
              }
            >
              {e.detail}
            </Pill>
          ))}
        </div>

        <Collapsible label="how does the reserve APY actually get derived?">
          The reserve token has its own simulated price, starting at $1.00 and compounding every period at the
          &ldquo;true&rdquo; rate set above — the same way a real yield-bearing token like USDY actually
          appreciates. The number this run actually uses for that period&rsquo;s yield isn&rsquo;t that input
          directly — it&rsquo;s <em>observed</em>, by measuring the price delta since last period and
          annualizing it with the exact day-count the real contract&rsquo;s <code>observed_source_apy_bps</code>{' '}
          uses (365-day years, so 12 periods is 360 days, not 365 — the two numbers above won&rsquo;t match
          exactly if you do the naive ×12 math by hand). No price noise is modeled, so observed recovers true
          exactly every period here — the point isn&rsquo;t to show drift, it&rsquo;s that the rate is
          genuinely <em>derived</em> from a price, not piped straight through from the input. That&rsquo;s also
          why minting or redeeming FYC/FFC below never distorts it: the estimate reads a per-token price, never
          the reserve&rsquo;s dollar value or token count. Reserve itself is <code>pool − outstanding</code>,
          recomputed every period right after that period&rsquo;s repayments land and right before new
          originations are processed — so principal that just got repaid is already earning this same
          period&rsquo;s yield, and stays in reserve earning it every period after, until a new loan actually
          consumes it.
        </Collapsible>

        <h3>Tranche value over time</h3>
        <LineChart
          xDomain={[0, effectivePeriods]}
          yDomain={[0, maxBalance * 1.1]}
          xTicks={tickSet(effectivePeriods)}
          yTicks={Array.from({ length: 6 }, (_, i) => (maxBalance * 1.1 * i) / 5)}
          formatX={(v) => 'p' + Math.round(v)}
          formatY={(v) => fmtUSD(v)}
          vLines={[{ x: cursor, color: 'var(--text-primary)', dashed: false }]}
          series={[
            { name: 'FYC', color: 'var(--fyc)', points: result.steps.map((s) => ({ x: s.period, y: s.fyc })) },
            { name: 'FFC', color: 'var(--ffc)', points: result.steps.map((s) => ({ x: s.period, y: s.ffc })) },
            { name: 'Outstanding', color: 'var(--text-muted)', points: result.steps.map((s) => ({ x: s.period, y: s.outstanding })), dashed: true, width: 1.5 },
          ]}
        />

        <h3 style={{ marginTop: 24 }}>Token price over time</h3>
        <p className="section-dek" style={{ fontSize: 12, marginBottom: 10 }}>
          NAV per token — <code>v_tranche / total_supply</code>, both starting at $1.00 by construction. Mint
          and redeem events below move both value and supply together at the price in effect that period, so
          price stays continuous across them. The 15% fee-mint into FYC is price-neutral by construction (it
          mints exactly enough new tokens to leave price unchanged), so it&rsquo;s left out of supply tracking
          entirely. This model prices every mint and redeem at the same single NAV — the real contract mints at
          the (higher) optimistic price and redeems at the (lower) conservative one, which this simplified
          model doesn&rsquo;t distinguish. FYC also has no insurance-burn price defense modeled here — a
          default drops its price directly.
        </p>
        <LineChart
          xDomain={[0, effectivePeriods]}
          yDomain={[minPrice, maxPrice]}
          xTicks={tickSet(effectivePeriods)}
          yTicks={Array.from({ length: 6 }, (_, i) => minPrice + ((maxPrice - minPrice) * i) / 5)}
          formatX={(v) => 'p' + Math.round(v)}
          formatY={(v) => '$' + v.toFixed(3)}
          hLines={[{ y: 1, label: '$1.00 genesis price', color: 'var(--text-muted)' }]}
          vLines={[{ x: cursor, color: 'var(--text-primary)', dashed: false }]}
          series={[
            { name: 'FYC price', color: 'var(--fyc)', points: result.steps.map((s) => ({ x: s.period, y: s.fycPrice })) },
            { name: 'FFC price', color: 'var(--ffc)', points: result.steps.map((s) => ({ x: s.period, y: s.ffcPrice })) },
          ]}
        />

        <h3 style={{ marginTop: 24 }}>Coverage & severity over time</h3>
        <LineChart
          xDomain={[0, effectivePeriods]}
          yDomain={[0, maxPct]}
          xTicks={tickSet(effectivePeriods)}
          yTicks={Array.from({ length: 6 }, (_, i) => (maxPct * i) / 5)}
          formatX={(v) => 'p' + Math.round(v)}
          formatY={(v) => v.toFixed(0) + '%'}
          hLines={[{ y: severityGateMax, label: `${severityGateMax}% severity gate`, color: 'var(--warning)' }]}
          vLines={[{ x: cursor, color: 'var(--text-primary)', dashed: false }]}
          series={[
            { name: 'Coverage', color: 'var(--fyc)', points: result.steps.map((s) => ({ x: s.period, y: s.coveragePct })) },
            { name: 'Severity', color: 'var(--ffc)', points: result.steps.map((s) => ({ x: s.period, y: s.severity * 100 })) },
          ]}
        />

        <h3 style={{ marginTop: 24 }}>Blended APY over time</h3>
        <LineChart
          xDomain={[0, effectivePeriods]}
          yDomain={[0, maxApy]}
          xTicks={tickSet(effectivePeriods)}
          yTicks={Array.from({ length: 6 }, (_, i) => (maxApy * i) / 5)}
          formatX={(v) => 'p' + Math.round(v)}
          formatY={(v) => v.toFixed(1) + '%'}
          vLines={[{ x: cursor, color: 'var(--text-primary)', dashed: false }]}
          series={[
            { name: 'FYC APY', color: 'var(--fyc)', points: result.steps.map((s) => ({ x: s.period, y: s.fycApyAnnualized })) },
            { name: 'FFC APY', color: 'var(--ffc)', points: result.steps.map((s) => ({ x: s.period, y: s.ffcApyAnnualized })) },
          ]}
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>Event log</h3>
        <p className="section-dek" style={{ fontSize: 12, marginBottom: 10 }}>
          One row per month — click any month to see exactly how its yield split, who minted or redeemed, and
          what defaulted or originated.
        </p>
        {cursor === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing has happened yet — advance the playhead.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
            {Array.from({ length: cursor }, (_, i) => cursor - i).map((p) => {
              const s = result.steps[p];
              const monthEvents = result.events.filter((e) => e.period === p);
              const open = expandedMonths.has(p);
              const hasFlag = monthEvents.some((e) => e.kind === 'origination-blocked' || e.kind === 'mint-blocked' || e.kind === 'default');
              return (
                <div key={p} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMonths((prev) => {
                        const next = new Set(prev);
                        next.has(p) ? next.delete(p) : next.add(p);
                        return next;
                      })
                    }
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: open ? 'var(--surface-2)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      color: hasFlag ? 'var(--critical)' : 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', minWidth: 8 }}>{open ? '▾' : '▸'}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: 44 }}>p{p}</span>
                    <span>
                      FYC <b style={{ color: 'var(--fyc)' }}>+{fmtUSD(s.fycYield)}</b> · FFC{' '}
                      <b style={{ color: 'var(--ffc)' }}>+{fmtUSD(s.ffcYield)}</b>
                    </span>
                    {monthEvents.length > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        · {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </button>
                  {open && (
                    <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border)', fontSize: 12.5 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>RESERVE YIELD</div>
                          <div>
                            gross {fmtUSD(s.reserveGrossYield)} → net {fmtUSD(s.reserveNetYield)} (85%)
                            <br />
                            observed APY {s.reserveObservedApyPct.toFixed(3)}%, price ${s.reservePrice.toFixed(4)}
                            <br />
                            FYC <b style={{ color: 'var(--fyc)' }}>{fmtUSD(s.fycReserveShare)}</b> · FFC{' '}
                            <b style={{ color: 'var(--ffc)' }}>{fmtUSD(s.ffcReserveShare)}</b> — flat pro-rata by
                            tranche size
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>LOAN INTEREST</div>
                          <div>
                            gross {fmtUSD(s.loanGrossInterest)} → net {fmtUSD(s.loanNetYield)} (85%), fee{' '}
                            {fmtUSD(s.feeValue)} (15%, mints new FYC)
                            <br />
                            blended book APY {s.loanObservedApyPct.toFixed(2)}%, k = {s.k.toFixed(2)}×, coverage{' '}
                            {s.coveragePct.toFixed(1)}%, severity {(s.severity * 100).toFixed(2)}%
                            <br />
                            FYC <b style={{ color: 'var(--fyc)' }}>{fmtUSD(s.fycLoanShare)}</b> · FFC{' '}
                            <b style={{ color: 'var(--ffc)' }}>{fmtUSD(s.ffcLoanShare)}</b> — severity-curve split
                          </div>
                        </div>
                      </div>
                      {monthEvents.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>EVENTS</div>
                          {monthEvents.map((e, i) => (
                            <div
                              key={i}
                              style={{
                                color:
                                  e.kind === 'origination-blocked' || e.kind === 'mint-blocked' || e.kind === 'default'
                                    ? 'var(--critical)'
                                    : e.kind === 'mint' || e.kind === 'redeem'
                                      ? 'var(--text-primary)'
                                      : 'var(--text-secondary)',
                                padding: '2px 0',
                              }}
                            >
                              {e.detail}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        ending FYC {fmtUSD(s.fyc)} (${s.fycPrice.toFixed(4)}/token, {Math.round(s.fycSupply).toLocaleString()} tokens) ·
                        FFC {fmtUSD(s.ffc)} (${s.ffcPrice.toFixed(4)}/token, {Math.round(s.ffcSupply).toLocaleString()} tokens)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Callout>
          Cumulative yield through period {cursor}: FYC <b style={{ color: 'var(--fyc)' }}>{fmtUSD(step.fycCumYield)}</b>, FFC{' '}
          <b style={{ color: 'var(--ffc)' }}>{fmtUSD(step.ffcCumYield)}</b>.
        </Callout>
      </div>
    </>
  );
}

function tickSet(periods: number): number[] {
  const step = periods <= 12 ? 2 : periods <= 36 ? 6 : 12;
  const ticks: number[] = [];
  for (let i = 0; i <= periods; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] !== periods) ticks.push(periods);
  return ticks;
}

function updateOrig(
  setter: React.Dispatch<React.SetStateAction<OriginationEvent[]>>,
  id: string,
  patch: Partial<OriginationEvent>,
) {
  setter((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
}
function updateDef(
  setter: React.Dispatch<React.SetStateAction<DefaultEvent[]>>,
  id: string,
  patch: Partial<DefaultEvent>,
) {
  setter((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}
function updateActivity(
  setter: React.Dispatch<React.SetStateAction<TrancheActivityEvent[]>>,
  id: string,
  patch: Partial<TrancheActivityEvent>,
) {
  setter((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="control">
      <div className="row">
        <span className="name">{label}</span>
        <span className="val">
          {prefix}
          {value.toLocaleString('en-US')}
          {suffix}
        </span>
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          width: '100%',
          padding: '7px 10px',
          borderRadius: 6,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}
      />
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '0 1 96px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          width: '100%',
          minWidth: 76,
          maxWidth: 110,
          padding: '5px 7px',
          borderRadius: 5,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
        }}
      />
    </label>
  );
}

function MiniSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '0 1 96px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minWidth: 76,
          maxWidth: 110,
          padding: '5px 7px',
          borderRadius: 5,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EventRow({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      {children}
      <button
        onClick={onRemove}
        style={{
          marginLeft: 'auto',
          border: 'none',
          background: 'var(--critical-wash)',
          color: 'var(--critical)',
          borderRadius: 6,
          padding: '5px 9px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
