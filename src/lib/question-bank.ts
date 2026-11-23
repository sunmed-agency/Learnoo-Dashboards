import type { BankQuestion } from '@/src/lib/api';
import type { ExamFormQuestion } from '@/src/lib/exam-form';

/**
 * Question-bank questions as new exam-form questions. Images stay as URLs for the preview; the
 * server copies the files when the exam is saved (bank_question_id / bank_answer_id). A question
 * whose image was its section's shared image gets that image as its own.
 */
export function mapBankQuestions(chosen: BankQuestion[], timestamp = Date.now()): ExamFormQuestion[] {
  return chosen.map((question, questionIndex) => ({
    id: `new-bank-${timestamp}-${questionIndex}`,
    quizId: '',
    text: question.text,
    type: question.type,
    score: Number(question.score) || 0,
    autoCorrect: question.type === 'short_answer' ? false : question.auto_correct,
    image: null,
    imagePreview: question.image ?? question.section?.image ?? '',
    sectionKey: '',
    bankQuestionId: question.id,
    answers: question.answers.map((answer, answerIndex) => ({
      id: `a-bank-${timestamp}-${questionIndex}-${answerIndex}`,
      text: answer.text,
      isCorrect: answer.is_correct,
      reason: answer.reason ?? '',
      image: null,
      imagePreview: answer.image ?? '',
      reason_image: null,
      reasonImagePreview: answer.reason_image ?? '',
      bankAnswerId: answer.id,
    })),
  }));
}

/** Adds the picked questions after the current ones (empty placeholder questions are dropped). */
export function mergeBankImport(current: ExamFormQuestion[], imported: ExamFormQuestion[]): { questions: ExamFormQuestion[]; removed: ExamFormQuestion[] } {
  const kept = current.filter((question) => question.text.trim() !== '');
  return { questions: [...kept, ...imported], removed: current.filter((question) => !kept.includes(question)) };
}

export const BANK_TYPE_LABELS: Record<BankQuestion['type'], { ar: string; en: string }> = {
  single_choice: { ar: 'اختيار واحد', en: 'Single choice' },
  multiple_choice: { ar: 'اختيار متعدد', en: 'Multiple choice' },
  true_false: { ar: 'صح وخطأ', en: 'True / false' },
  short_answer: { ar: 'إجابة نصية', en: 'Written answer' },
};
