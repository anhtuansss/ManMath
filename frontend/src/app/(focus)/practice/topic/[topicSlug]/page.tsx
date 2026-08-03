import { PracticeClient } from '../../../../../components/practice/PracticeClient';

type PracticeTopicPageProps = {
  params: Promise<{
    topicSlug: string;
  }>;
};

export default async function PracticeTopicPage({
  params,
}: PracticeTopicPageProps) {
  const { topicSlug } = await params;

  return <PracticeClient topicSlug={topicSlug} />;
}
