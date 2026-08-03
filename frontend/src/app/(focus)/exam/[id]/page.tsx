import { ExamTakingClient } from '../../../../components/exam/ExamTakingClient';

type ExamTakingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamTakingPage({ params }: ExamTakingPageProps) {
  const { id } = await params;

  return <ExamTakingClient examId={id} />;
}
