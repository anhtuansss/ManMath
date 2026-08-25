import { expect, test, type Page } from '@playwright/test';

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

const sessionQuestions = [
  {
    id: 'session-sc', type: 'single_choice' as const, section: 1, order: 1,
    content: 'Chọn A.', topicSlug: 'ham-so',
    choices: [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }, { id: 'c', content: 'C' }, { id: 'd', content: 'D' }],
  },
  {
    id: 'session-tf', type: 'true_false_group' as const, section: 2, order: 2,
    content: 'Chọn đúng hoặc sai.', topicSlug: 'ham-so',
    statements: [{ id: 'a', content: 'A' }, { id: 'b', content: 'B' }, { id: 'c', content: 'C' }, { id: 'd', content: 'D' }],
  },
  { id: 'session-sa', type: 'short_answer' as const, section: 3, order: 3, content: 'Nhập 1,5.', topicSlug: 'ham-so' },
];

async function mockSessionExam(page: Page, examId: string, examVersionId: string, durationMinutes = 2): Promise<void> {
  await page.route(`**/api/v2/exams/${examId}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: examId,
        examVersionId,
        versionNumber: 1,
        title: 'Đề kiểm tra phiên làm bài',
        durationMinutes,
        subject: 'Toán',
        difficulty: 'medium',
        source: null,
        year: 2026,
        statusLabel: 'Published',
        questions: sessionQuestions,
      }),
    });
  });
}

test('V2 public read never exposes grading secrets', async ({ request }) => {
  const response = await request.get(`${apiBaseUrl}/api/v2/exams/${examId}`);
  expect(response.ok()).toBe(true);
  assertNoForbiddenPublicKeys(await response.json());
});

test('landing only advertises supported review and exam-discovery flows', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Khám phá kho đề', exact: true })).toHaveAttribute('href', '/dashboard');
  await expect(page.getByText('Đối chiếu đáp án và lời giải sau khi nộp bài', { exact: true })).toHaveCount(0);
});

test('deadline draft restores answers, current question, view mode, and does not save on timer ticks', async ({ page }) => {
  const sessionExamId = 'deadline-session-fixture';
  const sessionVersionId = 'deadline-session-version';
  await page.addInitScript(({ examId: draftExamId, examVersionId }) => {
    const now = Date.now();
    const draft = {
      version: 3,
      examId: draftExamId,
      examVersionId,
      startedAt: now - 45_000,
      deadlineAt: now + 75_000,
      answers: {
        'session-sc': { type: 'single_choice', choiceId: 'a' },
        'session-tf': { type: 'true_false_group', values: { a: true, b: false, c: true, d: false } },
        'session-sa': { type: 'short_answer', value: '1,5' },
      },
      currentQuestionId: 'session-tf',
      viewMode: 'single',
      submissionKey: 'a0000000-0000-4000-8000-000000000001',
      updatedAt: now,
    };
    localStorage.setItem(`manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`, JSON.stringify(draft));
    localStorage.setItem(`manmath:v2:exam-draft-reference:v1:${draftExamId}`, JSON.stringify({ examId: draftExamId, examVersionId }));
  }, { examId: sessionExamId, examVersionId: sessionVersionId });
  await mockSessionExam(page, sessionExamId, sessionVersionId);

  await page.goto(`/exam-v2/${sessionExamId}`);
  await expect(page.getByRole('button', { name: 'Từng câu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Câu 2 / 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mệnh đề a: Đúng', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^01:1[0-5]$/)).toBeVisible();

  await page.waitForTimeout(300);
  const firstUpdatedAt = await page.evaluate(({ examId: draftExamId, examVersionId }) => JSON.parse(
    localStorage.getItem(`manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`) ?? '{}',
  ).updatedAt as number, { examId: sessionExamId, examVersionId: sessionVersionId });
  await page.waitForTimeout(1_100);
  const secondUpdatedAt = await page.evaluate(({ examId: draftExamId, examVersionId }) => JSON.parse(
    localStorage.getItem(`manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`) ?? '{}',
  ).updatedAt as number, { examId: sessionExamId, examVersionId: sessionVersionId });
  expect(secondUpdatedAt).toBe(firstUpdatedAt);

  await page.reload();
  await expect(page.getByText('Câu 2 / 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mệnh đề b: Sai', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('stale draft waits for learner confirmation before starting the current version', async ({ page }) => {
  const sessionExamId = 'stale-session-fixture';
  const oldVersionId = 'old-session-version';
  const currentVersionId = 'current-session-version';
  await page.addInitScript(({ examId: draftExamId, examVersionId }) => {
    const now = Date.now();
    localStorage.setItem(`manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`, JSON.stringify({
      version: 3, examId: draftExamId, examVersionId, startedAt: now, deadlineAt: now + 120_000,
      answers: {}, currentQuestionId: 'session-sc', viewMode: 'all', submissionKey: 'a0000000-0000-4000-8000-000000000002', updatedAt: now,
    }));
    localStorage.setItem(`manmath:v2:exam-draft-reference:v1:${draftExamId}`, JSON.stringify({ examId: draftExamId, examVersionId }));
  }, { examId: sessionExamId, examVersionId: oldVersionId });
  await mockSessionExam(page, sessionExamId, currentVersionId);

  await page.goto(`/exam-v2/${sessionExamId}`);
  await expect(page.getByRole('heading', { name: 'Bản nháp thuộc phiên bản đề cũ' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bỏ bản nháp cũ và bắt đầu đề mới' })).toBeVisible();
  await expect.poll(() => page.evaluate(({ examId: draftExamId, examVersionId }) => localStorage.getItem(
    `manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`,
  ), { examId: sessionExamId, examVersionId: currentVersionId })).toBeNull();

  await page.getByRole('button', { name: 'Bỏ bản nháp cũ và bắt đầu đề mới' }).click();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await page.waitForTimeout(300);
  await expect.poll(() => page.evaluate((draftExamId) => JSON.parse(
    localStorage.getItem(`manmath:v2:exam-draft-reference:v1:${draftExamId}`) ?? '{}',
  ).examVersionId as string, sessionExamId)).toBe(currentVersionId);
});

test('expired draft freezes answers while still allowing a manual full-duration submission', async ({ page }) => {
  const sessionExamId = 'expired-session-fixture';
  const sessionVersionId = 'expired-session-version';
  let submittedPayload: { durationSeconds?: number } | null = null;
  let submittedKey: string | null = null;
  await page.addInitScript(({ examId: draftExamId, examVersionId }) => {
    const now = Date.now();
    const draft = {
      version: 3, examId: draftExamId, examVersionId, startedAt: now - 61_000, deadlineAt: now - 1,
      answers: { 'session-sc': { type: 'single_choice', choiceId: 'a' } },
      currentQuestionId: 'session-sc', viewMode: 'all', submissionKey: 'a0000000-0000-4000-8000-000000000003', updatedAt: now,
    };
    localStorage.setItem(`manmath:v2:exam-draft:v3:${draftExamId}:${examVersionId}`, JSON.stringify(draft));
    localStorage.setItem(`manmath:v2:exam-draft-reference:v1:${draftExamId}`, JSON.stringify({ examId: draftExamId, examVersionId }));
  }, { examId: sessionExamId, examVersionId: sessionVersionId });
  await mockSessionExam(page, sessionExamId, sessionVersionId, 1);
  await page.route(`**/api/v2/exams/${sessionExamId}/attempts`, async (route) => {
    submittedPayload = route.request().postDataJSON() as { durationSeconds?: number };
    submittedKey = route.request().headers()['idempotency-key'] ?? null;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      attemptId: 'expired-attempt', examId: sessionExamId, examVersionId: sessionVersionId,
      scoringPolicyId: 'vietnam_thpt_math_2025', scoreUnits: 0, maxScoreUnits: 175,
      correctCount: 0, totalQuestions: 3, unansweredCount: 2, durationSeconds: 60,
      submittedAt: new Date().toISOString(), results: [], anonymousReceiptToken: 'receipt-token',
    }) });
  });

  await page.goto(`/exam-v2/${sessionExamId}`);
  await expect(page.getByText('Hết giờ', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Nộp bài đã khóa', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài ngay', exact: true }).click();
  await expect.poll(() => submittedPayload?.durationSeconds).toBe(60);
  expect(submittedKey).toBe('a0000000-0000-4000-8000-000000000003');
});

test('network retry reuses the persisted submission key', async ({ page }) => {
  const sessionExamId = 'submission-retry-fixture';
  const sessionVersionId = 'submission-retry-version';
  const requestKeys: string[] = [];
  let requestCount = 0;
  await mockSessionExam(page, sessionExamId, sessionVersionId);
  await page.route(`**/api/v2/exams/${sessionExamId}/attempts`, async (route) => {
    requestCount += 1;
    requestKeys.push(route.request().headers()['idempotency-key'] ?? '');
    if (requestCount === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Tạm thời lỗi' }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      attemptId: 'retry-attempt', examId: sessionExamId, examVersionId: sessionVersionId,
      scoringPolicyId: 'vietnam_thpt_math_2025', scoreUnits: 0, maxScoreUnits: 175,
      correctCount: 0, totalQuestions: 3, unansweredCount: 3, durationSeconds: 0,
      submittedAt: new Date().toISOString(), results: [], anonymousReceiptToken: 'receipt-token',
    }) });
  });

  await page.goto(`/exam-v2/${sessionExamId}`);
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài ngay', exact: true }).click();
  await expect(page.getByText('Tạm thời lỗi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài ngay', exact: true }).click();
  await expect.poll(() => requestKeys.length).toBe(2);
  expect(requestKeys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(requestKeys[1]).toBe(requestKeys[0]);
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
  await page.waitForTimeout(250);
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

test('authenticated practice resumes a persistent session, autosaves, and submits with one stored key', async ({ page }) => {
  const session: any = {
    id: 'persistent-practice-session', status: 'in_progress',
    topic: { slug: 'ham-so-va-do-thi-nen-tang', name: 'Hàm số' },
    startedAt: new Date().toISOString(), submittedAt: null,
    scoreUnits: null, maxScoreUnits: null, fullyCorrectCount: null,
    totalQuestions: 1, unansweredCount: null,
    configuration: { topicSlug: 'ham-so-va-do-thi-nen-tang', subtopicSlug: null, requestedQuestionCount: 5, actualQuestionCount: 1, questionTypes: ['single_choice'] },
    questions: [{ sessionQuestionId: 'persistent-sc', order: 1, question: sessionQuestions[0], response: null, responseRevision: 0 }],
  };
  let activeSession: any = null;
  const submissionKeys: string[] = [];
  await page.addInitScript(() => window.localStorage.setItem('manmath-auth-token', 'persistent-practice-test-token'));
  await page.route('**/api/v2/practice/sessions/active?topicSlug=ham-so-va-do-thi-nen-tang', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ session: activeSession }) });
  });
  await page.route('**/api/v2/practice/sessions', async (route) => {
    activeSession = session;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
  });
  await page.route('**/api/v2/practice/sessions/persistent-practice-session/questions/persistent-sc/response', async (route) => {
    const body = route.request().postDataJSON() as { response: { choiceId?: string } | null; expectedRevision: number };
    session.questions[0] = { ...session.questions[0], response: body.response === null ? null : { type: 'single_choice', choiceId: body.response.choiceId ?? '' }, responseRevision: body.expectedRevision + 1 };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ response: body.response === null ? null : { type: 'single_choice', choiceId: body.response.choiceId }, responseRevision: body.expectedRevision + 1 }) });
  });
  await page.route('**/api/v2/practice/sessions/persistent-practice-session/submit', async (route) => {
    submissionKeys.push(route.request().headers()['idempotency-key'] ?? '');
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...session, status: 'completed', submittedAt: new Date().toISOString(), scoreUnits: 50, maxScoreUnits: 50, fullyCorrectCount: 1, unansweredCount: 0, questions: [{ ...session.questions[0], response: { type: 'single_choice', choiceId: 'a' }, responseRevision: 1, result: { isFullyCorrect: true, awardedScoreUnits: 50, maxScoreUnits: 50 } }] }) });
  });
  await page.goto('/practice/topic/ham-so-va-do-thi-nen-tang');
  await page.getByRole('button', { name: 'Bắt đầu luyện', exact: true }).click();
  await page.getByRole('radio').first().click();
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await expect(page.getByText('Kết quả:', { exact: false })).toBeVisible();
  expect(submissionKeys).toHaveLength(1);
  expect(submissionKeys[0]).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole('radio').first()).toBeDisabled();
});

test('dashboard links to the full exam library from its compact list and exposes Learning in navigation', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Chọn đề để chinh phục hôm nay' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xem tất cả đề thi →' })).toHaveAttribute('href', '/exams');
  await expect(page.getByRole('link', { name: 'Học tập' })).toHaveAttribute('href', '/learning');
});

test('persistent practice remains source-agnostic for mixed exam and question-bank pins', async ({ page }) => {
  const questions = [
    {
      sessionQuestionId: 'exam-source-sc', order: 1,
      question: sessionQuestions[0], response: null, responseRevision: 0,
    },
    {
      sessionQuestionId: 'bank-source-sc', order: 2,
      question: { ...sessionQuestions[0], id: 'bank-source-sc-question', content: 'Câu hỏi từ ngân hàng câu hỏi.' },
      response: null, responseRevision: 0,
    },
  ];
  let session: any = {
    id: 'mixed-source-practice-session', status: 'in_progress',
    topic: { slug: 'ham-so-va-do-thi-nen-tang', name: 'Hàm số' },
    startedAt: new Date().toISOString(), submittedAt: null,
    scoreUnits: null, maxScoreUnits: null, fullyCorrectCount: null,
    totalQuestions: 2, unansweredCount: null,
    configuration: { topicSlug: 'ham-so-va-do-thi-nen-tang', subtopicSlug: null, requestedQuestionCount: 5, actualQuestionCount: 2, questionTypes: ['single_choice'] },
    questions,
  };
  await page.addInitScript(() => window.localStorage.setItem('manmath-auth-token', 'mixed-source-test-token'));
  await page.route('**/api/v2/practice/sessions/active?topicSlug=ham-so-va-do-thi-nen-tang', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ session }) });
  });
  await page.route('**/api/topics', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ topics: [] }) });
  });
  await page.route('**/api/v2/practice/sessions/mixed-source-practice-session/questions/*/response', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ response: route.request().postDataJSON().response, responseRevision: 1 }) });
  });
  await page.goto('/practice/topic/ham-so-va-do-thi-nen-tang');
  await expect(page.getByText('Câu hỏi từ ngân hàng câu hỏi.')).toBeVisible();
  await page.getByRole('radio').first().click();
  await page.waitForTimeout(450);
  await expect(page.getByText('Câu hỏi từ ngân hàng câu hỏi.')).toBeVisible();
  await page.getByRole('radio').first().click();
  await page.waitForTimeout(450);
});

test('learning renders backend-owned overview and its practice recommendation', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('manmath-auth-token', 'learning-overview-test-token'));
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { id: 'learning-user', email: 'learner@example.com', fullName: 'Learner', avatarUrl: null } }) });
  });
  await page.route('**/api/me/learning-overview', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      overall: { topicSlug: null, subtopicSlug: null, topicName: null, subtopicName: null, earnedScoreUnits: 100, maxScoreUnits: 200, masteryPercent: 50, answeredCount: 3, fullyCorrectCount: 2, examQuestionCount: 2, practiceQuestionCount: 1, confidence: 'low', status: 'developing', corpusAvailableQuestionCount: 0, corpusStatus: 'not_applicable', isWeak: false },
      topics: [],
      subtopics: [],
      nextAction: { topicSlug: 'dao-ham-va-khao-sat-ham-so', subtopicSlug: 'tiep-tuyen-cua-do-thi-ham-so', title: 'Tiếp tuyến của đồ thị hàm số', corpusAvailableQuestionCount: 5, kind: 'assess', reason: 'Hãy luyện 5 câu để đánh giá chính xác mức độ thành thạo.' },
      continueItems: [],
      recentActivity: [],
      coverage: { scoreUnitAttemptCount: 3, unavailableV2AttemptCount: 0, examFactCount: 2, practiceFactCount: 1 },
    }) });
  });
  await page.goto('/learning');
  await expect(page.getByRole('heading', { name: 'Tiến độ luyện thi của bạn' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/dashboard');
  await expect(page.getByText('3 câu đã trả lời')).toBeVisible();
  await expect(page.getByText('Câu bỏ trống làm giảm mastery nhưng không tăng mẫu đánh giá.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Luyện 5 câu' })).toHaveAttribute('href', '/practice/topic/dao-ham-va-khao-sat-ham-so?subtopic=tiep-tuyen-cua-do-thi-ham-so');
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Tổng quan học tập' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nguồn dữ liệu mastery' })).toBeVisible();
});
