import { expect, test } from '@playwright/test';

const examId = 'verify-v2-minimal-exam';
const apiBaseUrl = 'http://127.0.0.1:5000';

const forbiddenPublicKeys = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'tolerance',
  'solution',
  'explanation',
]);

function assertNoForbiddenPublicKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenPublicKeys);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    expect(forbiddenPublicKeys.has(key), `Public V2 response exposed ${key}`).toBe(false);
    assertNoForbiddenPublicKeys(nestedValue);
  }
}

test('V2 public read never exposes grading secrets', async ({ request }) => {
  const response = await request.get(`${apiBaseUrl}/api/v2/exams/${examId}`);
  expect(response.ok()).toBe(true);
  assertNoForbiddenPublicKeys(await response.json());
});

test('anonymous learner can answer all three V2 types, restore draft, submit, and recover a safe receipt', async ({ page }) => {
  await page.goto(`/exam-v2/${examId}`);
  await expect(page.getByRole('button', { name: 'Tất cả câu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await expect(page.getByLabel('Câu trả lời').first()).toBeVisible();

  await page.getByRole('radio').first().click();
  const trueButtons = page.getByRole('button', { name: /^Mệnh đề [a-d]: Đúng$/ });
  const falseButtons = page.getByRole('button', { name: /^Mệnh đề [a-d]: Sai$/ });
  await trueButtons.nth(0).click();
  await falseButtons.nth(1).click();
  await trueButtons.nth(2).click();
  await falseButtons.nth(3).click();
  await page.getByLabel('Câu trả lời').first().fill('1,5');

  // The draft uses the versioned V2 local-storage key. Reload proves that the
  // three discriminated response shapes restore without client-side grading.
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Câu trả lời').first()).toHaveValue('1,5');

  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài ngay', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/exam-v2/${examId}/result\\?attemptId=`));
  await expect(page.getByRole('heading', { name: 'Danh sách câu' })).toBeVisible();

  // Anonymous recovery uses the token only in a request header from
  // sessionStorage. A page reload must not expose a review capability.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Danh sách câu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem đáp án đúng', exact: true })).toHaveCount(0);
});

test('learner can switch between all-question and single-question modes without losing answers', async ({ page }) => {
  await page.goto(`/exam-v2/${examId}`);
  await page.getByRole('button', { name: 'Từng câu', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Từng câu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('article[id^="v2-question-"]')).toHaveCount(1);
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await expect(page.getByText('Câu 2 / 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Câu trước', exact: true }).click();
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Tất cả câu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tất cả câu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('article[id^="v2-question-"]')).toHaveCount(3);
});

test('switching display modes preserves the active full-exam question', async ({ page }) => {
  const questions = Array.from({ length: 8 }, (_, index) => ({
    id: `mode-question-${index + 1}`,
    type: 'single_choice' as const,
    section: 1,
    order: index + 1,
    content: `Câu kiểm tra chuyển chế độ ${index + 1}.`,
    topicSlug: 'ham-so-va-do-thi-nen-tang',
    choices: [
      { id: 'a', content: 'A' },
      { id: 'b', content: 'B' },
      { id: 'c', content: 'C' },
      { id: 'd', content: 'D' },
    ],
  }));

  await page.route('**/api/v2/exams/mode-switch-fixture', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mode-switch-fixture',
        examVersionId: 'mode-switch-version',
        versionNumber: 1,
        title: 'Kiểm tra chuyển chế độ',
        durationMinutes: 90,
        subject: 'Toán',
        difficulty: 'medium',
        source: null,
        year: 2026,
        statusLabel: 'Draft',
        questions,
      }),
    });
  });

  await page.goto('/exam-v2/mode-switch-fixture');
  const questionEight = page.locator('#v2-question-mode-question-8');
  await questionEight.scrollIntoViewIfNeeded();
  await questionEight.getByRole('radio').first().click();

  await page.getByRole('button', { name: 'Từng câu', exact: true }).click();
  await expect(page.getByText('Câu 8 / 8', { exact: true })).toBeVisible();
  await expect(questionEight).toBeVisible();
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveAttribute('aria-current', 'true');

  await page.getByRole('button', { name: 'Tất cả câu', exact: true }).click();
  await expect(page.locator('article[id^="v2-question-"]')).toHaveCount(8);
  await expect(questionEight).toBeInViewport();
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveAttribute('aria-current', 'true');
});

test('internal draft preview renders safe V2 content without a taking flow', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manmath-auth-token', 'preview-test-token');
  });
  await page.route('**/api/v2/internal/exam-previews/preview-fixture', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'preview-fixture',
        examVersionId: 'draft-version-id',
        versionNumber: 1,
        title: 'Đề preview V2',
        durationMinutes: 90,
        subject: 'Toán',
        difficulty: 'medium',
        source: null,
        year: 2026,
        statusLabel: 'Draft',
        questions: [
          {
            id: 'preview-sc', type: 'single_choice', section: 1, order: 1,
            content: 'Tính $x^2$ với $x=2$.', topicSlug: 'ham-so',
            assets: [{ src: '/images/2026_001_img/sc-07-hinh-lap-phuong.png', alt: 'Hình preview' }],
            choices: [
              { id: 'a', content: '$4$' }, { id: 'b', content: '$2$' },
              { id: 'c', content: '$0$' }, { id: 'd', content: '$-4$' },
            ],
          },
          {
            id: 'preview-tf', type: 'true_false_group', section: 2, order: 2,
            content: 'Xét các mệnh đề.', topicSlug: 'ham-so',
            statements: [
              { id: 'a', content: '$1=1$.' }, { id: 'b', content: '$1=0$.' },
              { id: 'c', content: '$2>1$.' }, { id: 'd', content: '$2<1$.' },
            ],
          },
          {
            id: 'preview-sa', type: 'short_answer', section: 3, order: 3,
            content: 'Nhập $2,5$.', topicSlug: 'ham-so',
          },
        ],
      }),
    });
  });

  await page.goto('/exam-v2-preview/preview-fixture');
  await expect(page.getByText('DRAFT PREVIEW', { exact: true })).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.getByAltText('Hình preview')).toHaveAttribute('src', /sc-07-hinh-lap-phuong\.png$/);
  await expect(page.getByRole('radio').first()).toBeDisabled();
  await expect(page.getByLabel('Câu trả lời')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Nộp bài', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-current', 'true');
});
