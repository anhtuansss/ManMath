import { PracticeClient } from '../../../../../components/practice/PracticeClient';

type PracticeTopicPageProps = {
  params: Promise<{
    topicSlug: string;
  }>;
  searchParams: Promise<{ subtopic?: string }>;
};

export default async function PracticeTopicPage({
  params, searchParams,
}: PracticeTopicPageProps) {
  const { topicSlug } = await params;
  const { subtopic } = await searchParams;

  return <PracticeClient topicSlug={topicSlug} initialSubtopicSlug={subtopic} />;
}
