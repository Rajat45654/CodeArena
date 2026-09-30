import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeArena — College Coding Contest Platform',
  description: 'Production-style full-stack platform with a sandboxed code-execution engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
