import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';
import { SeverityGateProvider } from '@/components/SeverityGateContext';
import { SimulatorStateProvider } from '@/components/SimulatorStateContext';

export const metadata: Metadata = {
  title: 'FYC / FFC Yield Distribution — Redesign',
  description:
    'Design tool for the FYC/FFC yield-distribution redesign: coverage & severity curve, gates, simulator, glossary, and implementation notes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <SeverityGateProvider>
          <SimulatorStateProvider>
            <div className="shell">
              <Sidebar />
              <main className="main">
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </SimulatorStateProvider>
        </SeverityGateProvider>
      </body>
    </html>
  );
}
