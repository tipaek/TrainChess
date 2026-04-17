import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrainChess',
  description: 'Play against Stockfish, get every move graded, replay the bad ones.',
  verification: {
    google: 'OcEwIlauw9muKExSMDAkUtSFiMDwiNwK-Zk8wmE6aas',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
