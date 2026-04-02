import { HomePage } from '@/components/home-page';

type HomeRouteProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function Page({ searchParams }: HomeRouteProps) {
  const params = await searchParams;
  return <HomePage initialCode={params.code ?? ''} />;
}
