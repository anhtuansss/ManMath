import { ExamAttemptsClient } from '../../../../../components/exam/ExamAttemptsClient';

type ExamAttemptsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamAttemptsPage({ params }: ExamAttemptsPageProps) {
  const { id } = await params;

  return <ExamAttemptsClient examId={id} />;
}
