import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevGuard Web',
  description: 'Developer environment inspector',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden bg-[#0c160a] text-[#dae6d2]">
        {children}
      </body>
    </html>
  );
}
