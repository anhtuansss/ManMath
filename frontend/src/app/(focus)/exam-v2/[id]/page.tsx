import { ExamContentTakingClient } from '../../../../components/exam-v2/ExamContentTakingClient';

type ExamContentTakingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExamContentTakingPage({ params }: ExamContentTakingPageProps) {
  const { id } = await params;
  return <ExamContentTakingClient examId={id} />;
}
