'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, MessageSquareText, Send, Trash2 } from 'lucide-react';
import { getApiErrorMessage, studentNotesApi, type StudentNote } from '@/src/lib/api';
import { formatDate, useTr } from './shared';

export const NOTE_ROLE_LABELS: Record<NonNullable<StudentNote['author']>['role'], { ar: string; en: string; tone: string }> = {
  owner: { ar: 'المالك', en: 'Owner', tone: 'bg-[#0A1033] text-white' },
  admin: { ar: 'الإدارة', en: 'Admin', tone: 'bg-[#2137D6]/10 text-[#1F33C4]' },
  supervisor: { ar: 'مشرف', en: 'Supervisor', tone: 'bg-amber-50 text-amber-800' },
  instructor: { ar: 'مدرّس', en: 'Teacher', tone: 'bg-emerald-50 text-emerald-700' },
};

export function NoteAuthor({ note }: { note: StudentNote }) {
  const { ar, tr } = useTr();
  const role = note.author ? NOTE_ROLE_LABELS[note.author.role] : null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6B7280]">
      <span className="font-semibold text-[#111827]">{note.author?.name || tr('ملاحظة قديمة', 'Earlier note')}</span>
      {role && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${role.tone}`}>{ar ? role.ar : role.en}</span>}
      <span aria-hidden>·</span>
      <time dateTime={note.created_at ?? undefined}>{formatDate(note.created_at, ar)}</time>
    </span>
  );
}

/** The notes log: add a note (who and when are recorded), read them newest first, delete your own. */
export default function NotesTab({ studentId, notes, isLoading, isError }: { studentId: string; notes: StudentNote[] | undefined; isLoading: boolean; isError: boolean }) {
  const { tr } = useTr();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['student-profile', studentId, 'notes'] });

  const add = useMutation({
    mutationFn: (text: string) => studentNotesApi.add(studentId, text),
    onSuccess: () => { setBody(''); toast.success(tr('اتضافت الملاحظة', 'Note added')); void refresh(); },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('ماقدرناش نضيف الملاحظة', 'Could not add the note'))),
  });
  const remove = useMutation({
    mutationFn: (note: StudentNote) => studentNotesApi.remove(studentId, note.id),
    onSuccess: () => { toast.success(tr('اتمسحت الملاحظة', 'Note deleted')); void refresh(); },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('ماقدرناش نمسح الملاحظة', 'Could not delete the note'))),
  });

  // Not a <form>: this box also sits inside the student edit form, and forms cannot nest.
  const submit = () => {
    const text = body.trim();
    if (text && !add.isPending) add.mutate(text);
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-labelledby="student-note-label" className="rounded-2xl border border-[#EEEEEE] bg-white p-4 sm:p-5">
        <label id="student-note-label" htmlFor="student-note" className="mb-2 block text-[14px] font-bold text-[#111827]">{tr('إضافة ملاحظة', 'Add a note')}</label>
        <textarea
          id="student-note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit(); } }}
          maxLength={2000}
          rows={3}
          placeholder={tr('اكتب ملاحظة أو توجيه عن الطالب...', 'Write a note or guidance about this student...')}
          className="w-full resize-y rounded-xl border border-[#EEEEEE] bg-[#F9FAFB] px-3 py-2.5 text-[14px] text-[#111827] focus:border-[#2137D6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[#6B7280]">{tr('بيتسجّل اسمك ووقت الكتابة. الطالب مش بيشوف الملاحظات.', 'Your name and the time are recorded. Students never see notes.')}</p>
          <button type="button" onClick={submit} disabled={!body.trim() || add.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1C2EB8] disabled:opacity-50">
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}{tr('إضافة', 'Add')}
          </button>
        </div>
      </div>

      {isLoading && <p role="status" className="flex items-center gap-2 text-sm text-[#6B7280]"><Loader2 className="h-4 w-4 animate-spin" />{tr('جارٍ التحميل...', 'Loading...')}</p>}
      {isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{tr('تعذّر تحميل الملاحظات.', 'Could not load the notes.')}</p>}
      {notes && notes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center text-sm text-[#6B7280]">
          <MessageSquareText className="h-6 w-6 text-[#9CA3AF]" />{tr('مفيش ملاحظات على الطالب ده لسه.', 'No notes on this student yet.')}
        </div>
      )}
      {notes && notes.length > 0 && (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-2xl border border-[#EEEEEE] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <NoteAuthor note={note} />
                {note.can_delete && (
                  <button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(tr('مسح الملاحظة دي؟', 'Delete this note?'))) remove.mutate(note); }} className="shrink-0 rounded-lg p-1.5 text-[#9CA3AF] hover:bg-red-50 hover:text-red-600" aria-label={tr('مسح الملاحظة', 'Delete note')} title={tr('مسح', 'Delete')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-7 text-[#111827]">{note.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The notes log on its own (fetches the notes itself), e.g. on the student edit page. */
export function StudentNotesPanel({ studentId }: { studentId: string }) {
  const query = useQuery({
    queryKey: ['student-profile', studentId, 'notes'],
    queryFn: () => studentNotesApi.list(studentId),
    enabled: Boolean(studentId),
    retry: false,
  });
  return <NotesTab studentId={studentId} notes={query.data?.data} isLoading={query.isLoading} isError={query.isError} />;
}
