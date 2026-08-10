import { AttemptEntryClient } from '../../../../components/exam/AttemptEntryClient';

type AttemptDetailPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function AttemptDetailPage({
  params,
}: AttemptDetailPageProps) {
  const { attemptId } = await params;

  return <AttemptEntryClient attemptId={attemptId} />;
}
