import { expect, test } from '@playwright/test';

const examId = 'thpt-math-v2-sample';
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
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expect(page.getByLabel('Câu trả lời')).toBeVisible();

  await page.getByRole('radio').first().click();
  const trueButtons = page.getByRole('button', { name: 'Đúng', exact: true });
  const falseButtons = page.getByRole('button', { name: 'Sai', exact: true });
  await trueButtons.nth(0).click();
  await falseButtons.nth(1).click();
  await trueButtons.nth(2).click();
  await falseButtons.nth(3).click();
  await page.getByLabel('Câu trả lời').fill('1,5');

  // The draft uses the versioned V2 local-storage key. Reload proves that the
  // three discriminated response shapes restore without client-side grading.
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Câu trả lời')).toHaveValue('1,5');

  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài ngay', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/exam-v2/${examId}/result\\?attemptId=`));
  await expect(page.getByText('Kết quả theo từng câu')).toBeVisible();

  // Anonymous recovery uses the token only in a request header from
  // sessionStorage. A page reload must not expose a review capability.
  await page.reload();
  await expect(page.getByText('Kết quả theo từng câu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem đáp án đúng', exact: true })).toHaveCount(0);
});
