/**
 * The instructor plans on the public Learnoo landing page. Saved by admins at
 * /settings/landing-plans and served by GET /v1/landing-plans (no login).
 */

export type LocalizedText = { ar: string; en: string };

export type LandingPlan = {
  name: LocalizedText;
  description: LocalizedText;
  /** Monthly price in EGP; null shows "contact us" instead of a number. */
  price: number | null;
  max_students: number;
  badge: LocalizedText;
  highlighted: boolean;
  features: { ar: string[]; en: string[] };
};

export type LandingPlans = {
  /** Where "Join as a lecturer" goes (WhatsApp or a form). Null: the contact section. */
  contact_url: string | null;
  plans: LandingPlan[];
};

export const MAX_LANDING_PLANS = 6;
export const MAX_PLAN_FEATURES = 12;

/** Same as LandingPlansController::defaults() in the backend. */
export const DEFAULT_LANDING_PLANS: LandingPlans = {
  contact_url: null,
  plans: [
    {
      name: { ar: 'البداية', en: 'Starter' },
      description: { ar: 'للدكتور اللي بادئ يقدّم شرحه أونلاين لمادة أو اتنين.', en: 'For lecturers starting to teach one or two subjects online.' },
      price: 5000,
      max_students: 500,
      badge: { ar: '', en: '' },
      highlighted: false,
      features: {
        ar: ['مساحتك الخاصة على Learnoo بنطاق باسمك', 'فيديوهات محمية بعلامة مائية', 'اختبارات وتفعيل بالأكواد', 'ملخصات ومكتبة إلكترونية', 'دعم فني بالعربي'],
        en: ['Your own space on Learnoo with your own subdomain', 'Protected videos with a watermark', 'Exams and activation codes', 'Summaries and an e-library', 'Arabic-speaking support'],
      },
    },
    {
      name: { ar: 'النمو', en: 'Growth' },
      description: { ar: 'للدكتور اللي طلابه بيزيدوا كل ترم.', en: 'For lecturers whose students grow every term.' },
      price: 7500,
      max_students: 800,
      badge: { ar: 'الأكثر طلبًا', en: 'Most popular' },
      highlighted: true,
      features: {
        ar: ['كل مميزات «البداية»', 'محاضرات بث مباشر', 'متابعة أولياء الأمور', 'مجتمع ونقاشات للطلاب', 'تقارير المشاهدة والتقدّم'],
        en: ['Everything in Starter', 'Live-streamed lectures', 'Parent follow-up', 'Student community and discussions', 'Viewing and progress reports'],
      },
    },
    {
      name: { ar: 'التوسّع', en: 'Scale' },
      description: { ar: 'لفرق التدريس والأقسام اللي فيها أكتر من دكتور.', en: 'For teaching teams and departments with several lecturers.' },
      price: 10000,
      max_students: 1200,
      badge: { ar: '', en: '' },
      highlighted: false,
      features: {
        ar: ['كل مميزات «النمو»', 'أكتر من مدرّس ومساعدين بصلاحيات', 'تفعيل جماعي بشيت Excel', 'جهاز واحد لكل طالب', 'أولوية في الدعم الفني'],
        en: ['Everything in Growth', 'Several lecturers and assistants with roles', 'Bulk activation from an Excel sheet', 'One device per student', 'Priority support'],
      },
    },
  ],
};

export function emptyLandingPlan(): LandingPlan {
  return {
    name: { ar: '', en: '' },
    description: { ar: '', en: '' },
    price: null,
    max_students: 100,
    badge: { ar: '', en: '' },
    highlighted: false,
    features: { ar: [''], en: [''] },
  };
}

const trim = (value: string | null | undefined) => (value ?? '').trim();
const lines = (values: string[]) => values.map(trim).filter(Boolean);

/** What the PUT sends: trimmed text, blank feature lines dropped. */
export function landingPlansPayload(form: LandingPlans): LandingPlans {
  return {
    contact_url: trim(form.contact_url) || null,
    plans: form.plans.map((plan) => ({
      name: { ar: trim(plan.name.ar), en: trim(plan.name.en) },
      description: { ar: trim(plan.description.ar), en: trim(plan.description.en) },
      price: plan.price === null || Number.isNaN(plan.price) ? null : Math.round(plan.price),
      max_students: Math.round(plan.max_students),
      badge: { ar: trim(plan.badge.ar), en: trim(plan.badge.en) },
      highlighted: plan.highlighted,
      features: { ar: lines(plan.features.ar), en: lines(plan.features.en) },
    })),
  };
}

/** Keys of the invalid fields, like `plans.0.name.ar`; same rules as the backend. */
export function landingPlansErrors(form: LandingPlans): string[] {
  const errors: string[] = [];
  const contact = trim(form.contact_url);
  if (contact && !/^https:\/\/[^\s]+\.[^\s]+/.test(contact)) errors.push('contact_url');
  if (form.plans.length === 0) errors.push('plans');

  form.plans.forEach((plan, i) => {
    (['ar', 'en'] as const).forEach((lang) => {
      if (!trim(plan.name[lang])) errors.push(`plans.${i}.name.${lang}`);
      if (lines(plan.features[lang]).length === 0) errors.push(`plans.${i}.features.${lang}`);
    });
    if (plan.price !== null && (Number.isNaN(plan.price) || plan.price < 0)) errors.push(`plans.${i}.price`);
    if (!Number.isFinite(plan.max_students) || plan.max_students < 1) errors.push(`plans.${i}.max_students`);
  });

  return errors;
}

/** Server-side read for the landing page; falls back to the defaults. */
export async function fetchLandingPlans(apiBaseUrl: string): Promise<LandingPlans> {
  try {
    const res = await fetch(`${apiBaseUrl}/v1/landing-plans`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_LANDING_PLANS;
    const body = (await res.json()) as { data?: LandingPlans };
    return body.data && Array.isArray(body.data.plans) && body.data.plans.length > 0 ? body.data : DEFAULT_LANDING_PLANS;
  } catch {
    return DEFAULT_LANDING_PLANS;
  }
}
