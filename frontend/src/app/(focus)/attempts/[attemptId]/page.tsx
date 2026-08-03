import { AttemptDetailClient } from '../../../../components/exam/AttemptDetailClient';

type AttemptDetailPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function AttemptDetailPage({
  params,
}: AttemptDetailPageProps) {
  const { attemptId } = await params;

  return <AttemptDetailClient attemptId={attemptId} />;
}
