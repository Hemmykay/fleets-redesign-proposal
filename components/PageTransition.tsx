'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Keyed on pathname so React actually remounts this div on every route
 * change — without the key, .main-inner is a single persistent DOM node
 * across the whole app (the layout never remounts), so its CSS fade-in
 * animation would only ever play once, on first load, and never again on
 * subsequent navigation. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="main-inner" key={pathname}>
      {children}
    </div>
  );
}
