/** Lecturers' join requests from the landing page form; the owner follows up on them. */

export const SUBSCRIPTION_REQUEST_STATUSES = ['new', 'contacted', 'subscribed', 'rejected'] as const;
export type SubscriptionRequestStatus = (typeof SUBSCRIPTION_REQUEST_STATUSES)[number];

export type SubscriptionRequest = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  university: string | null;
  faculty: string | null;
  subjects: string | null;
  students_count: number | null;
  message: string | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_max_students: number | null;
  locale: 'ar' | 'en';
  status: SubscriptionRequestStatus;
  owner_notes: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRequestPage = {
  data: SubscriptionRequest[];
  current_page: number;
  last_page: number;
  total: number;
  counts: Record<SubscriptionRequestStatus, number>;
};

/**
 * A wa.me link for the number. Egyptian local numbers (01xxxxxxxxx) get the
 * country code; numbers that already start with + or 20 are kept.
 */
export function whatsappLink(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^01\d{9}$/.test(digits)) digits = `2${digits}`;
  return `https://wa.me/${digits}`;
}
