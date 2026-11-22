import type { ExamFormQuestion, ExamFormSection } from '@/src/lib/exam-form';

/** One question from POST /v1/google-forms/import/preview (already mapped by the server). */
export interface GoogleFormQuestion {
  key: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'short_answer';
  score: number;
  auto_correct: boolean;
  required: boolean;
  section: string | null;
  image: { data: string; alt: string } | null;
  answers: { text: string; is_correct: boolean; reason: string; image: { data: string; alt: string } | null }[];
  accepted_answers: string[];
  feedback: { right: string; wrong: string; general: string; combined: string };
  warnings: GoogleFormWarning[];
  include: boolean;
  needs_answer: boolean;
  source: Record<string, string | null>;
}

export type GoogleFormWarning =
  | 'no_answer_key'
  | 'answer_not_in_options'
  | 'other_option_dropped'
  | 'other_option_was_correct'
  | 'image_failed'
  | 'extra_image_dropped';

export interface GoogleFormPreview {
  form_id: string;
  revision_id: string | null;
  title: string;
  description: string;
  is_quiz: boolean;
  questions: GoogleFormQuestion[];
  skipped: { item_id: string; title: string; reason: string }[];
  previous_imports: { quiz_id: number; title: string; imported_at: string; questions: number }[];
}

const WARNINGS: Record<GoogleFormWarning, { ar: string; en: string }> = {
  no_answer_key: { ar: 'لا توجد إجابة صحيحة في Google Forms. حدّدها قبل الإضافة.', en: 'No correct answer set in Google Forms. Choose it before adding.' },
  answer_not_in_options: { ar: 'الإجابة الصحيحة في Google لا تطابق أي اختيار. السؤال غير مُضاف إلا إذا اخترته وحدّدت الإجابة.', en: 'Answer key doesn’t match any option. Excluded unless you include it and pick the answer.' },
  other_option_dropped: { ar: 'تم حذف اختيار «أخرى».', en: 'The “Other” option was removed.' },
  other_option_was_correct: { ar: 'كانت الإجابة الصحيحة هي «أخرى» وتم حذفه. السؤال غير مُضاف إلا إذا اخترته وحدّدت الإجابة.', en: 'The correct answer was “Other”, which was removed. Excluded unless you include it and pick the answer.' },
  image_failed: { ar: 'تعذّر تحميل صورة. أُضيف السؤال بدونها.', en: 'An image could not be downloaded. Imported without it.' },
  extra_image_dropped: { ar: 'كان قبل السؤال صورة إضافية لم تُضف لأن للسؤال صورة.', en: 'An extra image before this question was not added (the question has its own).' },
};

const SKIP_REASONS: Record<string, { ar: string; en: string }> = {
  unsupported_scale: { ar: 'مقياس خطي غير مدعوم', en: 'Linear scale is not supported' },
  unsupported_rating: { ar: 'التقييم بالنجوم غير مدعوم', en: 'Rating is not supported' },
  unsupported_date: { ar: 'سؤال التاريخ غير مدعوم', en: 'Date question is not supported' },
  unsupported_time: { ar: 'سؤال الوقت غير مدعوم', en: 'Time question is not supported' },
  unsupported_file_upload: { ar: 'رفع الملفات غير مدعوم', en: 'File upload is not supported' },
  no_options: { ar: 'سؤال بدون اختيارات', en: 'Question without options' },
  unsupported_item: { ar: 'نوع غير مدعوم', en: 'Unsupported item type' },
};

export function warningText(code: GoogleFormWarning, ar: boolean): string {
  const text = WARNINGS[code];
  return text ? (ar ? text.ar : text.en) : code;
}

export function skipReasonText(code: string, ar: boolean): string {
  const text = SKIP_REASONS[code] ?? SKIP_REASONS.unsupported_item;
  return ar ? text.ar : text.en;
}

/** Which questions are ready: choice questions need at least one correct answer and two options. */
export function questionProblem(question: GoogleFormQuestion): 'no_correct' | 'few_options' | null {
  if (question.type === 'short_answer') return null;
  if (question.answers.length < 2) return 'few_options';
  if (!question.answers.some((answer) => answer.is_correct)) return 'no_correct';
  return null;
}

/** data:image/png;base64,... -> File, so the image goes through the normal exam upload. */
export function dataUrlToFile(dataUrl: string, name: string): File | null {
  const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  const extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  return new File([bytes], `${name}.${extension}`, { type: match[1] });
}

/**
 * The chosen questions as exam-form questions (+ the sections Google page breaks become).
 * Short answers keep Google's accepted answers as the expected answer the teacher reviews against.
 */
export function mapGoogleFormToExam(
  preview: GoogleFormPreview,
  chosen: GoogleFormQuestion[],
  timestamp = Date.now(),
): { questions: ExamFormQuestion[]; sections: ExamFormSection[] } {
  const sections: ExamFormSection[] = [];
  const sectionKeys = new Map<string, string>();
  for (const question of chosen) {
    if (question.section && !sectionKeys.has(question.section)) {
      const key = `new-sec-gf-${timestamp}-${sectionKeys.size}`;
      sectionKeys.set(question.section, key);
      sections.push({ key, title: question.section, image: null, imagePreview: '', maxQuestions: '', saved: true });
    }
  }

  const questions = chosen.map((question, questionIndex): ExamFormQuestion => {
    const image = question.image ? dataUrlToFile(question.image.data, `google-form-${questionIndex + 1}`) : null;
    const answers = question.type === 'short_answer'
      ? [{ id: `a-gf-${timestamp}-${questionIndex}-0`, text: question.accepted_answers.join(' / '), isCorrect: true, reason: question.feedback.combined }]
      : question.answers.map((answer, answerIndex) => {
          const answerImage = answer.image ? dataUrlToFile(answer.image.data, `google-form-${questionIndex + 1}-${answerIndex + 1}`) : null;
          return {
            id: `a-gf-${timestamp}-${questionIndex}-${answerIndex}`,
            text: answer.text,
            isCorrect: answer.is_correct,
            reason: answer.reason,
            image: answerImage,
            imagePreview: answerImage ? URL.createObjectURL(answerImage) : '',
            reason_image: null,
            reasonImagePreview: '',
          };
        });

    return {
      id: `new-gf-${timestamp}-${questionIndex}`,
      quizId: '',
      text: question.text,
      type: question.type,
      score: question.score,
      autoCorrect: question.type === 'short_answer' ? false : question.auto_correct,
      image,
      imagePreview: image ? URL.createObjectURL(image) : '',
      answers: answers.map((answer) => ({ image: null, imagePreview: '', reason_image: null, reasonImagePreview: '', ...answer })),
      sectionKey: question.section ? sectionKeys.get(question.section) ?? '' : '',
      source: JSON.stringify({ ...question.source, form_id: preview.form_id, revision_id: preview.revision_id }),
    };
  });

  return { questions, sections };
}

function sourceFormId(question: Pick<ExamFormQuestion, 'source'>): string | null {
  if (!question.source) return null;
  try {
    const source = JSON.parse(question.source) as { form_id?: unknown };
    return typeof source.form_id === 'string' ? source.form_id : null;
  } catch {
    return null;
  }
}

/**
 * Adds an import to the exam form. Importing the same Google Form again replaces the questions
 * (and the sections) the earlier import of that form added and that are not saved yet, instead of
 * adding them a second time. Questions typed by hand, other forms and saved questions stay;
 * empty placeholder questions are dropped.
 */
export function mergeGoogleFormImport(
  current: ExamFormQuestion[],
  currentSections: ExamFormSection[],
  imported: ExamFormQuestion[],
  importedSections: ExamFormSection[],
): { questions: ExamFormQuestion[]; sections: ExamFormSection[]; removed: ExamFormQuestion[] } {
  const formIds = new Set(imported.map(sourceFormId).filter((id): id is string => id !== null));
  const isReplaced = (question: ExamFormQuestion) => question.id.startsWith('new-gf-') && formIds.has(sourceFormId(question) ?? '');
  const kept = current.filter((question) => question.text.trim() !== '' && !isReplaced(question));
  const removed = current.filter((question) => !kept.includes(question));
  // Sections an earlier import added and that no kept question uses any more.
  const usedKeys = new Set(kept.map((question) => question.sectionKey).filter(Boolean));
  const sections = currentSections.filter((section) => !section.key.startsWith('new-sec-gf-') || usedKeys.has(section.key));

  return { questions: [...kept, ...imported], sections: [...sections, ...importedSections], removed };
}

/**
 * Opens Google's consent screen in a popup and resolves with the result the API callback posts back.
 * The popup is opened synchronously (inside the click) so browsers don't block it.
 */
export function openGoogleConsent(getUrl: () => Promise<string>, apiOrigin: string): Promise<{ ok: boolean; reason?: string; email?: string }> {
  const popup = window.open('about:blank', 'learnoo-google', 'width=520,height=680');
  return new Promise((resolve, reject) => {
    if (!popup) {
      reject(new Error('POPUP_BLOCKED'));
      return;
    }
    let settled = false;
    const finish = (value: { ok: boolean; reason?: string; email?: string }) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== apiOrigin || event.data?.type !== 'learnoo-google') return;
      finish({ ok: Boolean(event.data.ok), reason: event.data.reason, email: event.data.email });
    };
    window.addEventListener('message', onMessage);
    // Closed without finishing.
    const timer = window.setInterval(() => { if (popup.closed) finish({ ok: false, reason: 'closed' }); }, 600);
    getUrl().then((url) => { popup.location.href = url; }).catch((error) => {
      popup.close();
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
      reject(error);
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Google Picker ships no types
type PickerWindow = Window & { gapi?: { load: (name: string, callback: () => void) => void }; google?: { picker?: any } };

let pickerScript: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  const win = window as PickerWindow;
  if (win.google?.picker) return Promise.resolve();
  pickerScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = () => win.gapi?.load('picker', () => resolve());
    script.onerror = () => { pickerScript = null; reject(new Error('PICKER_LOAD_FAILED')); };
    document.head.appendChild(script);
  });
  return pickerScript;
}

/** Google Picker limited to Google Forms, one file. Resolves with the form id, or null when cancelled. */
export async function pickGoogleForm(options: { token: string; apiKey: string; appId: string; locale: string }): Promise<string | null> {
  await loadPicker();
  const picker = (window as PickerWindow).google!.picker;
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.FORMS).setMode(picker.DocsViewMode.LIST);
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(options.token)
      .setDeveloperKey(options.apiKey)
      .setAppId(options.appId)
      .setLocale(options.locale)
      .setOrigin(window.location.origin)
      .setCallback((data: { action: string; docs?: { id: string }[] }) => {
        if (data.action === picker.Action.PICKED) resolve(data.docs?.[0]?.id ?? null);
        else if (data.action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
