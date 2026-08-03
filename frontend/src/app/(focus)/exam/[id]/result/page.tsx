import { ExamResultClient } from '../../../../../components/exam/ExamResultClient';

type ExamResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamResultPage({ params }: ExamResultPageProps) {
  const { id } = await params;

  return <ExamResultClient examId={id} />;
}
