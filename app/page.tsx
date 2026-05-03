import { HomePage } from '@/components/home-page';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Planning Poker',
  url: 'https://planning-poker.fr',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: 'fr-FR',
  description:
    'Outil de planning poker gratuit en ligne pour creer une session, inviter une equipe agile et reveler les estimations en temps reel.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR'
  },
  featureList: [
    'Creation de session instantanee',
    'Vote en temps reel',
    'Decks de cartes personnalisables',
    'Groupes de participants',
    'Revelation simultanee des estimations'
  ]
};

type HomeRouteProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function Page({ searchParams }: HomeRouteProps) {
  const params = await searchParams;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePage initialCode={params.code ?? ''} />
    </>
  );
}
