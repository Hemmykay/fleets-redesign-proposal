# FYC / FFC Yield Distribution — Redesign

A Next.js design tool for the FYC/FFC yield-distribution redesign — coverage & severity curve,
the two new severity-based gates, a full time-stepped scenario simulator, a glossary, and
implementation suggestions grounded in a real reference SDK (Hylo).

Nothing in this app is live in the `pinochio` program. It's a design/spec tool, not a client
for the deployed contract.

## Run it locally

Requires Node.js 20+ (built and tested on Node 23).

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

To build for production:

```bash
npm run build
npm run start
```

## Structure

- `lib/model.ts` — every formula (coverage, severity, the premium curve, both gates,
  amortization) in one place. This is the source of truth every page reads from.
- `lib/simulate.ts` — the time-stepped scenario engine used by `/simulator`, built entirely
  on top of `lib/model.ts`.
- `app/*/page.tsx` — one route per section (see the sidebar): the problem, internal
  accounting, the coverage/severity explorer, validation, what changes, the end-to-end
  formula, implementation suggestions, open questions, the glossary, and the simulator.
- `components/` — shared UI (`ui.tsx`), the reusable SVG line chart (`LineChart.tsx`), the
  sidebar nav, and the architecture flow diagram.
- `docs/yield-distribution-redesign.md` — the original written proposal this whole design
  builds on and, in places, supersedes (see the amber callout on the home page for exactly
  which parts).

## Status

Design proposal. The severity dial, both new gates (severity-based origination gate, FFC
minting ceiling), and the levelized-interest internal accounting are all still open for
sign-off — see `/open-questions` for the specific list.
