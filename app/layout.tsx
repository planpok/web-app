import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Poker Planning',
  description: 'Sessions de planning poker en temps reel'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
