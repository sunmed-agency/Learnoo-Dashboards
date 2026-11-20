import { toApiDateTime } from './platform-date-time';
import type { GeneratedExamQuestion } from '@/src/lib/exam-ai';
import type { Course } from '@/src/types';

export type ExamFormQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer';

export interface ExamFormAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  reason: string;
  image?: File | null;
  imagePreview?: string;
  reason_image?: File | null;
  reasonImagePreview?: string;
}

export interface ExamFormQuestion {
  id: string;
  quizId?: string;
  text: string;
  type: ExamFormQuestionType;
  score: number;
  autoCorrect: boolean;
  answers: ExamFormAnswer[];
  image?: File | null;
  imagePreview?: string;
  /** Key of the section ("قسم") this question belongs to, or '' for none. */
  sectionKey?: string;
}

/** An exam section ("قسم"): questions that share one image shown above each of them. */
export interface ExamFormSection {
  /** Client key the questions point to (existing sections use "sec-<id>"). */
  key: string;
  /** Saved section id (edit mode). */
  id?: string;
  title: string;
  image: File | null;
  /** Saved image URL, a blob: preview of `image`, or ''. */
  imagePreview: string;
  /** How many questions the section may hold ('' = no limit). */
  maxQuestions?: string;
  /** UI only: the section card is folded into its summary row (after «حفظ القسم»). */
  saved?: boolean;
}

export function newExamSection(): ExamFormSection {
  return { key: `new-sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: '', image: null, imagePreview: '', maxQuestions: '', saved: false };
}

/** section key -> how many questions point to it. */
export function countQuestionsBySection(questions: { sectionKey?: string }[]): Record<string, number> {
  return questions.reduce<Record<string, number>>((counts, question) => {
    if (question.sectionKey) counts[question.sectionKey] = (counts[question.sectionKey] ?? 0) + 1;
    return counts;
  }, {});
}

/** The section's question limit as a number, or null for no limit. */
export function sectionLimit(section: Pick<ExamFormSection, 'maxQuestions'>): number | null {
  const n = Number.parseInt(String(section.maxQuestions ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface ExamFormDetails {
  title: string;
  courses: string[];
  chapter: string;
  type: 'exam' | 'homework';
  duration: string;
  totalMarks: string;
  passingMarks: string;
  maxAttempts: string;
  status: 'Draft' | 'Active';
  startTime: string;
  endTime: string;
  is_public: 'true' | 'false' | 'included';
}

/** Exam banner (header image shown at the top of the exam while students take it). */
export interface ExamBannerState {
  /** A newly picked file to upload, or null when keeping the current banner or none. */
  file: File | null;
  /** What the form shows: the saved banner URL, a blob: preview of `file`, or '' for no banner. */
  preview: string;
}

/** Recommended banner size (4:1, like a Google Forms header) and the limits the backend enforces. */
export const EXAM_BANNER = {
  width: 1600,
  height: 400,
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const EMPTY_EXAM_BANNER: ExamBannerState = { file: null, preview: '' };

export function getExamBannerFileError(file: Pick<File, 'type' | 'size'>): 'type' | 'size' | null {
  if (!(EXAM_BANNER.mimeTypes as readonly string[]).includes(file.type)) return 'type';
  if (file.size > EXAM_BANNER.maxBytes) return 'size';
  return null;
}

export interface ApiErrorPayload {
  message?: string;
  details?: string;
  errors?: Record<string, unknown>;
  data?: unknown;
  id?: string | number;
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getApiErrorMessages(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];

  return Object.values(errors).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    return typeof value === 'string' ? [value] : [];
  });
}

export function mapGeneratedQuestionsToForm(
  questions: GeneratedExamQuestion[],
  timestamp = Date.now()
): ExamFormQuestion[] {
  return questions.map((question, questionIndex) => ({
    id: `new-ai-q-${timestamp}-${questionIndex}`,
    quizId: '',
    text: question.text,
    type: question.type,
    score: question.score,
    autoCorrect: question.autoCorrect,
    image: null,
    imagePreview: '',
    answers: question.answers.map((answer, answerIndex) => ({
      id: `a-ai-${timestamp}-${questionIndex}-${answerIndex}`,
      text: answer.text,
      isCorrect: answer.isCorrect,
      reason: answer.reason,
      image: null,
      imagePreview: '',
      reason_image: null,
      reasonImagePreview: '',
    })),
  }));
}

export function getQuizCourseIds(
  courses: Course[] | undefined,
  courseId?: number,
  courseIds?: number[]
): string[] {
  if (Array.isArray(courses)) return courses.map((course) => String(course.id));
  if (courseId) return [String(courseId)];
  if (Array.isArray(courseIds)) return courseIds.map(String);
  return [];
}

/** Exam title suggested by an imported file: its name without the extension, `_` read as a space. */
export function examTitleFromFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isObjectUrl(value?: string): value is string {
  return typeof value === 'string' && value.startsWith('blob:');
}

export function revokeObjectUrl(value?: string) {
  if (isObjectUrl(value)) URL.revokeObjectURL(value);
}

export function revokeAnswerObjectUrls(answer: ExamFormAnswer) {
  revokeObjectUrl(answer.imagePreview);
  revokeObjectUrl(answer.reasonImagePreview);
}

export function revokeQuestionObjectUrls(question: ExamFormQuestion) {
  revokeObjectUrl(question.imagePreview);
  question.answers.forEach(revokeAnswerObjectUrls);
}

export function revokeQuestionsObjectUrls(questions: ExamFormQuestion[]) {
  questions.forEach(revokeQuestionObjectUrls);
}

export function createReplacementPreview(previousPreview: string | undefined, file: File | null) {
  revokeObjectUrl(previousPreview);
  return file ? URL.createObjectURL(file) : '';
}

function appendExamFields(formData: FormData, details: ExamFormDetails) {
  details.courses.forEach((courseId) => formData.append('course_ids[]', courseId));
  formData.append('course_id', details.courses[0]);
  if (details.chapter) formData.append('chapter_id', details.chapter);
  formData.append('title', details.title);
  formData.append('type', details.type);
  formData.append('duration', details.duration);
  formData.append('total_marks', details.totalMarks);
  formData.append('passing_marks', details.passingMarks);
  formData.append('max_attempts', details.maxAttempts);
  formData.append('is_public', details.is_public);
  formData.append('status', details.status.toLowerCase());
  formData.append('start_time', toApiDateTime(details.startTime));
  formData.append('end_time', toApiDateTime(details.endTime));
}

function isNewQuestionId(id: string) {
  return id.startsWith('new-') || id.startsWith('ai-q-');
}

function isNewAnswerId(id: string) {
  return id.startsWith('a-') || id.startsWith('ai-a-');
}

export function buildExamFormData(
  details: ExamFormDetails,
  questions: ExamFormQuestion[],
  mode: 'create' | 'edit',
  banner: ExamBannerState = EMPTY_EXAM_BANNER,
  sections: ExamFormSection[] = []
): FormData {
  const formData = new FormData();
  appendExamFields(formData, details);
  if (banner.file instanceof File) formData.append('banner', banner.file);
  else if (mode === 'edit' && !banner.preview) formData.append('remove_banner', '1');

  // Sections: always say they are part of this save, so removing the last one works too.
  formData.append('sections_sync', '1');
  const sectionKeys = new Set(sections.map((section) => section.key));
  sections.forEach((section, index) => {
    const key = `sections[${index}]`;
    formData.append(`${key}[key]`, section.key);
    if (mode === 'edit' && section.id) formData.append(`${key}[id]`, section.id);
    formData.append(`${key}[title]`, section.title);
    const limit = sectionLimit(section);
    if (limit != null) formData.append(`${key}[max_questions]`, String(limit));
    if (section.image instanceof File) formData.append(`${key}[image]`, section.image);
    else if (mode === 'edit' && section.id && !section.imagePreview) formData.append(`${key}[remove_image]`, '1');
  });

  questions.forEach((question, questionIndex) => {
    const questionKey = `questions[${questionIndex}]`;
    formData.append(`${questionKey}[id]`, mode === 'edit' && !isNewQuestionId(question.id) ? question.id : '');
    formData.append(`${questionKey}[text]`, question.text);
    formData.append(`${questionKey}[type]`, question.type);
    formData.append(`${questionKey}[score]`, String(question.score));
    formData.append(`${questionKey}[auto_correct]`, question.autoCorrect ? '1' : '0');
    formData.append(`${questionKey}[order]`, String(questionIndex + 1));
    if (question.sectionKey && sectionKeys.has(question.sectionKey)) {
      formData.append(`${questionKey}[section_key]`, question.sectionKey);
    }
    if (question.image instanceof File) formData.append(`${questionKey}[image]`, question.image);
    if (mode === 'edit' && question.image === null && !question.imagePreview) {
      formData.append(`${questionKey}[remove_image]`, '1');
    }

    if (question.type === 'short_answer') return;

    question.answers.forEach((answer, answerIndex) => {
      const answerKey = `${questionKey}[answers][${answerIndex}]`;
      formData.append(`${answerKey}[id]`, mode === 'edit' && !isNewAnswerId(answer.id) ? answer.id : '');
      formData.append(`${answerKey}[text]`, answer.text);
      formData.append(`${answerKey}[is_correct]`, answer.isCorrect ? '1' : '0');
      if (answer.reason) formData.append(`${answerKey}[reason]`, answer.reason);
      if (answer.image instanceof File) formData.append(`${answerKey}[image]`, answer.image);
      if (mode === 'edit' && answer.image === null && !answer.imagePreview) {
        formData.append(`${answerKey}[remove_image]`, '1');
      }
      if (answer.reason_image instanceof File) {
        formData.append(`${answerKey}[reason_image]`, answer.reason_image);
      }
      if (mode === 'edit' && answer.reason_image === null && !answer.reasonImagePreview) {
        formData.append(`${answerKey}[remove_reason_image]`, '1');
      }
    });
  });

  return formData;
}

export function focusExamField(id: string) {
  const target = document.getElementById(id);
  const card = target?.closest('[data-question-card]');
  if (card?.getAttribute('data-collapsed') === 'true') {
    card.querySelector<HTMLElement>('[data-toggle-question]')?.click();
  }
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    const input = element?.matches('input,textarea,select,button') ? element : element?.querySelector<HTMLElement>('input,textarea,select,button');
    input?.focus({ preventScroll: true });
    (input ?? element)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

export function getExamErrorField(errors: Record<string, unknown>, questions: ExamFormQuestion[]): string {
  const field = Object.keys(errors)[0] ?? '';
  const parts = field.replace(/\[(\w+)\]/g, '.$1').split('.');
  if (parts[0] === 'questions') {
    const question = questions[Number(parts[1])];
    if (!question) return 'exam-questions';
    if (parts[2] === 'answers' && question.answers[Number(parts[3])]) {
      const answer = question.answers[Number(parts[3])];
      return `${parts[4] === 'is_correct' ? 'correct' : 'answer'}-${question.id}-${answer.id}`;
    }
    return `${parts[2] === 'score' ? 'score' : 'question'}-${question.id}`;
  }
  const fields: Record<string, string> = { banner: 'banner', course_id: 'courses', course_ids: 'courses', total_marks: 'totalMarks', passing_marks: 'passingMarks', max_attempts: 'maxAttempts', start_time: 'startTime', end_time: 'endTime', chapter_id: 'chapter', is_public: 'is_public' };
  return `exam-${fields[parts[0]] ?? parts[0]}`;
}

export function validateExamQuestions(questions: ExamFormQuestion[]) {
  const questionIds = new Set<string>();
  const answerIds = new Set<string>();
  const noCorrectAnswerIds = new Set<string>();
  let firstInvalid: ExamFormQuestion | undefined;
  let firstInvalidField = '';
  let firstInvalidType: 'question' | 'answer' | 'correct' | undefined;
  for (const question of questions) {
    if (!question.text.trim()) questionIds.add(question.id);
    if (question.type !== 'short_answer') {
      if (!question.answers.some(answer => answer.isCorrect)) noCorrectAnswerIds.add(question.id);
      for (const answer of question.answers) {
        if (!answer.text.trim()) answerIds.add(`${question.id}:${answer.id}`);
      }
    }
    if (!firstInvalid) {
      const answer = question.answers.find(answer => answerIds.has(`${question.id}:${answer.id}`));
      if (questionIds.has(question.id)) {
        firstInvalidType = 'question'; firstInvalidField = `question-${question.id}`;
      } else if (answer) {
        firstInvalidType = 'answer'; firstInvalidField = `answer-${question.id}-${answer.id}`;
      } else if (noCorrectAnswerIds.has(question.id)) {
        firstInvalidType = 'correct'; firstInvalidField = `correct-${question.id}-${question.answers[0]?.id}`;
      }
      if (firstInvalidField) firstInvalid = question;
    }
  }
  return { questionIds, answerIds, noCorrectAnswerIds, firstInvalid, firstInvalidField, firstInvalidType };
}
