import { RouletteHomePage } from '@/components/roulette-home-page';

type RouletteRouteProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function RoulettePage({ searchParams }: RouletteRouteProps) {
  const params = await searchParams;
  return <RouletteHomePage initialCode={params.code ?? ''} />;
}
