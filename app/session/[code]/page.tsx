import { SessionPage } from '@/components/session-page';

type SessionRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function Page({ params }: SessionRouteProps) {
  const { code } = await params;
  return <SessionPage code={code} />;
}
