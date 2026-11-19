'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';
import toast, { Toaster } from 'react-hot-toast';
import { Building2, ExternalLink, Inbox, Mail, MessageCircle, Phone, Search, Trash2, Users } from 'lucide-react';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { useDeleteSubscriptionRequest, useSubscriptionRequests, useUpdateSubscriptionRequest } from '@/src/hooks';
import {
  SUBSCRIPTION_REQUEST_STATUSES,
  whatsappLink,
  type SubscriptionRequest,
  type SubscriptionRequestStatus,
} from '@/src/lib/subscription-requests';

const STATUS_STYLE: Record<SubscriptionRequestStatus, string> = {
  new: 'bg-blue-50 text-[#2137D6] ring-[#2137D6]/20',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  subscribed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const number = new Intl.NumberFormat('en-US');

function RequestCard({ request }: { request: SubscriptionRequest }) {
  const t = useTranslations('subscriptionRequests');
  const locale = useLocale();
  const update = useUpdateSubscriptionRequest();
  const remove = useDeleteSubscriptionRequest();
  const [notes, setNotes] = useState(request.owner_notes ?? '');
  const date = (iso: string) => new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  const setStatus = async (status: SubscriptionRequestStatus) => {
    try {
      await update.mutateAsync({ id: request.id, status });
      toast.success(t('statusSaved'));
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const saveNotes = async () => {
    try {
      await update.mutateAsync({ id: request.id, owner_notes: notes.trim() || null });
      toast.success(t('notesSaved'));
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const onDelete = async () => {
    if (!window.confirm(t('deleteConfirm', { name: request.name }))) return;
    try {
      await remove.mutateAsync(request.id);
      toast.success(t('deleted'));
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const details = [
    { icon: Building2, label: t('university'), value: [request.university, request.faculty].filter(Boolean).join(' · ') || null },
    { icon: Inbox, label: t('subjects'), value: request.subjects },
    { icon: Users, label: t('students'), value: request.students_count ? number.format(request.students_count) : null },
  ].filter((d) => d.value);

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6 ${request.status === 'new' ? 'border-[#2137D6]/25' : 'border-[#EEEEEE]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-bold text-[#111827]">{request.name}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${STATUS_STYLE[request.status]}`}>{t(`status.${request.status}`)}</span>
          </div>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            {t('sentAt', { date: date(request.created_at) })}
            {request.contacted_at && <> · {t('contactedAt', { date: date(request.contacted_at) })}</>}
          </p>
        </div>
        <div className="rounded-xl bg-[#F4F5FD] px-3 py-2 text-[13px]">
          <span className="text-[#6B7280]">{t('plan')}: </span>
          {request.plan_name ? (
            <span className="font-bold text-[#2137D6]">
              {request.plan_name}
              {request.plan_price !== null && <span className="font-semibold text-[#4B5563]"> · <span dir="ltr">{number.format(request.plan_price)}</span> {t('perMonth')}</span>}
              {request.plan_max_students !== null && <span className="font-semibold text-[#4B5563]"> · {t('upTo', { count: number.format(request.plan_max_students) })}</span>}
            </span>
          ) : (
            <span className="font-semibold text-[#4B5563]">{t('noPlan')}</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`tel:${request.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#1C2EB8]">
          <Phone className="h-4 w-4" /><span dir="ltr">{request.phone}</span>
        </a>
        <a href={whatsappLink(request.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-emerald-600">
          <MessageCircle className="h-4 w-4" />{t('whatsapp')}
        </a>
        {request.email && (
          <a href={`mailto:${request.email}`} className="inline-flex items-center gap-2 rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-[14px] font-semibold text-[#374151] transition hover:bg-[#F9FAFB]">
            <Mail className="h-4 w-4" /><span dir="ltr">{request.email}</span>
          </a>
        )}
      </div>

      {details.length > 0 && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 rounded-xl bg-[#F9FAFB] p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
              <div className="min-w-0">
                <dt className="text-[12px] text-[#6B7280]">{label}</dt>
                <dd className="text-[14px] font-semibold text-[#111827]">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {request.message && (
        <div className="mt-4 rounded-xl border-s-4 border-[#2137D6]/30 bg-[#F9FAFB] px-4 py-3">
          <p className="text-[12px] text-[#6B7280]">{t('message')}</p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-7 text-[#111827]">{request.message}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 border-t border-[#F3F4F6] pt-4 md:grid-cols-[1fr_auto]">
        <div className="grid gap-1.5">
          <label htmlFor={`notes-${request.id}`} className="text-[13px] font-medium text-[#4B5563]">{t('notes')}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea id={`notes-${request.id}`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} className="min-h-[44px] flex-1 resize-y rounded-xl border border-[#EEEEEE] px-3 py-2 text-[14px] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20" />
            <button type="button" onClick={saveNotes} disabled={update.isPending || notes === (request.owner_notes ?? '')} className="self-start rounded-xl border border-[#2137D6]/30 px-4 py-2 text-[14px] font-semibold text-[#2137D6] transition hover:bg-[#F4F5FD] disabled:opacity-40">{t('saveNotes')}</button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-[#4B5563]">{t('changeStatus')}</span>
            <select value={request.status} onChange={(e) => setStatus(e.target.value as SubscriptionRequestStatus)} disabled={update.isPending} className="rounded-xl border border-[#EEEEEE] bg-white px-3 py-2.5 text-[14px] font-semibold text-[#111827] focus:border-[#2137D6] focus:outline-none">
              {SUBSCRIPTION_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </label>
          <button type="button" onClick={onDelete} disabled={remove.isPending} aria-label={t('delete')} title={t('delete')} className="rounded-xl p-2.5 text-[#9CA3AF] transition hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SubscriptionRequestsPage() {
  const t = useTranslations('subscriptionRequests');
  const { role } = useCurrentUser();
  const [status, setStatus] = useState<SubscriptionRequestStatus | undefined>('new');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebounce(search.trim(), 400);
  const { data, isLoading, isError, error, refetch } = useSubscriptionRequests({ status, search: debouncedSearch, page });

  const forbidden = role !== undefined && role !== null && role !== 'Super Admin'
    || (isError && /403|forbidden|unauthori[sz]ed/i.test(String((error as Error)?.message ?? '')));
  const tabs: (SubscriptionRequestStatus | undefined)[] = [undefined, ...SUBSCRIPTION_REQUEST_STATUSES];
  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col">
      <Toaster position="top-right" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#6B7280]">{t('description')}</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6]/5 px-4 py-2.5 text-[14px] font-semibold text-[#2137D6] transition hover:bg-[#2137D6]/10">
          <ExternalLink className="h-4 w-4" />{t('openLanding')}
        </a>
      </div>

      {forbidden ? (
        <div className="rounded-2xl border border-[#EEEEEE] bg-white p-8 text-center text-[15px] text-[#4B5563]">{t('ownerOnly')}</div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {tabs.map((s) => {
                const active = s === status;
                const count = s ? data?.counts[s] : total;
                return (
                  <button
                    key={s ?? 'all'}
                    type="button"
                    onClick={() => { setStatus(s); setPage(1); }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition ${active ? 'bg-[#2137D6] text-white shadow-md shadow-[#2137D6]/20' : 'bg-white text-[#4B5563] ring-1 ring-[#EEEEEE] hover:bg-[#F9FAFB]'}`}
                  >
                    {t(`status.${s ?? 'all'}`)}
                    {count !== undefined && <span className={`rounded-full px-2 py-0.5 text-[12px] ${active ? 'bg-white/20' : s === 'new' && count > 0 ? 'bg-[#2137D6] text-white' : 'bg-[#F3F4F6]'}`}>{count}</span>}
                  </button>
                );
              })}
            </div>
            <label className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('search')} className="w-full rounded-xl border border-[#EEEEEE] bg-white py-2.5 pe-3 ps-9 text-[14px] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20" />
            </label>
          </div>

          {isLoading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-100" />)}</div>
          ) : isError ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EEEEEE] bg-white p-6">
              <p className="text-[14px] text-red-600">{t('loadFailed')}</p>
              <button type="button" onClick={() => refetch()} className="rounded-xl bg-[#2137D6]/5 px-4 py-2 text-[14px] font-semibold text-[#2137D6] hover:bg-[#2137D6]/10">{t('retry')}</button>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center">
              <Inbox className="mx-auto h-10 w-10 text-[#C7CDF5]" />
              <p className="mt-3 text-[16px] font-semibold text-[#111827]">{t('empty')}</p>
              <p className="mt-1 text-[14px] text-[#6B7280]">{t('emptyHint')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {data.data.map((request) => <RequestCard key={`${request.id}-${request.updated_at}`} request={request} />)}
              </div>
              {data.last_page > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3 pb-8">
                  <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-[14px] font-semibold disabled:opacity-40">{t('previous')}</button>
                  <span className="text-[14px] text-[#6B7280]">{t('pageOf', { page: data.current_page, pages: data.last_page })}</span>
                  <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= data.last_page} className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-[14px] font-semibold disabled:opacity-40">{t('next')}</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
