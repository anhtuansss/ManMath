import { ExamContentResultClient } from '../../../../../components/exam-v2/ExamContentResultClient';

type ExamContentResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExamContentResultPage({ params }: ExamContentResultPageProps) {
  const { id } = await params;
  return <ExamContentResultClient examId={id} />;
}
