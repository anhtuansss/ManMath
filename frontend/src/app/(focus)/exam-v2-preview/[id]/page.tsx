import { ExamContentDraftPreviewClient } from '../../../../components/exam-v2/ExamContentDraftPreviewClient';

type ExamContentDraftPreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExamContentDraftPreviewPage({
  params,
}: ExamContentDraftPreviewPageProps) {
  const { id } = await params;
  return <ExamContentDraftPreviewClient examId={id} />;
}
