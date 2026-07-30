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
      { href: '/explorer', num: '03', label: 'Coverage & curve' },
      { href: '/validation', num: '04', label: 'Validation' },
      { href: '/changes', num: '05', label: 'What changes' },
      { href: '/formula', num: '06', label: 'Formula' },
      { href: '/implementation', num: '07', label: 'Implementation' },
      { href: '/open-questions', num: '08', label: 'Open questions' },
      { href: '/ffc-reset', num: '09', label: 'FFC reset (exploratory)' },
    ],
  },
  {
    group: 'Redemption & liquidity',
    items: [
      { href: '/redemption', num: '10', label: 'Instant & scheduled redemption' },
      { href: '/tranche-swap', num: '11', label: 'jr_to_sr / sr_to_jr' },
      { href: '/yield-sources', num: '12', label: 'Multi-yield-source routing' },
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
