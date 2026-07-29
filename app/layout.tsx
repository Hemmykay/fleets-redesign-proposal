import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { SeverityGateProvider } from '@/components/SeverityGateContext';

export const metadata: Metadata = {
  title: 'FYC / FFC Yield Distribution — Redesign',
  description:
    'Design tool for the FYC/FFC yield-distribution redesign: coverage & severity curve, gates, simulator, glossary, and implementation notes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SeverityGateProvider>
          <div className="shell">
            <Sidebar />
            <main className="main">
              <div className="main-inner">{children}</div>
            </main>
          </div>
        </SeverityGateProvider>
      </body>
    </html>
  );
}
