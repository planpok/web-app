import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://planning-poker.fr';
const siteName = 'Planning Poker';
const siteDescription =
  'Planning poker gratuit en ligne pour estimer les user stories en equipe agile. Creez une session, partagez le code et revelez les votes en temps reel.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: 'Planning Poker gratuit en ligne | Estimation agile en temps reel',
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    'planning poker',
    'poker planning',
    'scrum poker',
    'estimation agile',
    'story points',
    'scrum',
    'kanban',
    'session planning poker gratuite'
  ],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName,
    title: 'Planning Poker gratuit en ligne',
    description: siteDescription
  },
  twitter: {
    card: 'summary',
    title: 'Planning Poker gratuit en ligne',
    description: siteDescription
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  category: 'productivity'
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
