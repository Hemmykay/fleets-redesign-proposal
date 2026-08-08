'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  num: string;
  label: string;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Design',
    items: [
      { href: '/problem', num: '01', label: 'The problem' },
      { href: '/accounting', num: '02', label: 'Internal accounting' },
      { href: '/coverage-severity-k', num: '03', label: 'Coverage, severity & k — simply' },
      { href: '/explorer', num: '04', label: 'Coverage & curve' },
      { href: '/validation', num: '05', label: 'Validation' },
      { href: '/changes', num: '06', label: 'What changes' },
      { href: '/formula', num: '07', label: 'Formula' },
      { href: '/implementation', num: '08', label: 'Implementation' },
      { href: '/open-questions', num: '09', label: 'Open questions' },
      { href: '/ffc-reset', num: '10', label: 'FFC reset (exploratory)' },
    ],
  },
  {
    group: 'Redemption & liquidity',
    items: [
      { href: '/redemption', num: '11', label: 'Instant & scheduled redemption' },
      { href: '/tranche-swap', num: '12', label: 'jr_to_sr / sr_to_jr' },
      { href: '/yield-sources', num: '13', label: 'Multi-yield-source routing' },
      { href: '/optimistic-price', num: '14', label: 'Optimistic vs. conservative price' },
      { href: '/llm-handoff', num: '15', label: 'LLM handoff (copy all)' },
    ],
  },
  {
    group: 'Loan lifecycle',
    items: [
      { href: '/loan-lifecycle', num: '16', label: 'Grace, cure & default' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { href: '/glossary', num: '§', label: 'Glossary' },
      { href: '/latex', num: '∑', label: 'LaTeX equations' },
      { href: '/simulator', num: '▶', label: 'Scenario simulator' },
      { href: '/code-diff', num: '⎇', label: 'Code diff' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-eyebrow">pinochio / src</div>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 className="sidebar-title">
            FYC / FFC
            <br />
            Yield Redesign
          </h1>
        </Link>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="sidebar-group-label">{g.group}</div>
            {g.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link${active ? ' active' : ''}`}
                >
                  <span className="num">{item.num}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        Design proposal — nothing here is live in the program yet.
      </div>
    </aside>
  );
}
