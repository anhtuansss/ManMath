import fs from 'fs';
import path from 'path';
import { disconnectPrisma, prisma } from '../lib/prisma';

type Asset = { src?: unknown; alt?: unknown };
async function main(): Promise<void> {
  const [examQuestions, bankQuestions] = await Promise.all([
    prisma.examVersionQuestion.findMany({ where: { examVersion: { status: 'published' } }, select: { id: true, assets: true } }),
    prisma.questionBankItem.findMany({ where: { status: 'published' }, select: { id: true, assets: true } }),
  ]);
  const questions = [...examQuestions, ...bankQuestions];
  const issues: string[] = []; const usage = new Map<string, number>(); const publicRoot = path.resolve(process.cwd(), '..', 'frontend', 'public');
  for (const question of questions) {
    if (question.assets === null) continue;
    if (!Array.isArray(question.assets)) { issues.push(`${question.id}:assets-not-array`); continue; }
    for (const raw of question.assets as Asset[]) { const src = raw?.src; const alt = raw?.alt; if (typeof src !== 'string' || !src.startsWith('/') || src.includes('..')) { issues.push(`${question.id}:invalid-src`); continue; } if (typeof alt !== 'string' || !alt.trim()) issues.push(`${question.id}:missing-alt`); usage.set(src, (usage.get(src) ?? 0) + 1); if (!fs.existsSync(path.resolve(publicRoot, `.${src}`))) issues.push(`${question.id}:missing-file:${src}`); }
  }
  console.log(JSON.stringify({ publishedExamQuestions: examQuestions.length, publishedQuestionBankItems: bankQuestions.length, publishedQuestions: questions.length, assetReferences: [...usage.values()].reduce((sum, value) => sum + value, 0), duplicateSrcUsage: [...usage.entries()].filter(([, value]) => value > 1).sort(), issues: issues.sort() }, null, 2));
  if (issues.length > 0) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
