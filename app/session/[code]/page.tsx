import { SessionPage } from '@/components/session-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Session de planning poker',
  robots: {
    index: false,
    follow: false
  }
};

type SessionRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function Page({ params }: SessionRouteProps) {
  const { code } = await params;
  return <SessionPage code={code} />;
}
