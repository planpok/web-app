import { RouletteSessionPage } from '@/components/roulette-session-page';

type RouletteSessionRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RouletteSessionRoute({ params }: RouletteSessionRouteProps) {
  const { code } = await params;
  return <RouletteSessionPage code={code} />;
}
