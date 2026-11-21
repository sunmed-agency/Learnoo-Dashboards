'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { can } from '@/src/lib/permissions';

type Author = { id?: string | number | null; full_name?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null; role?: string | null } | null | undefined;

/**
 * A comment/post author in the staff dashboards (owner, admin, teacher, supervisor).
 * Students show their phone under the name, and the name opens their profile.
 * The student app never uses this: there a student sees other students by name only.
 */
export default function StudentAuthor({ author, fallback, className = '', nameClassName = '' }: {
  author: Author;
  fallback: string;
  className?: string;
  nameClassName?: string;
}) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const name = author?.full_name?.trim() || [author?.first_name, author?.last_name].filter(Boolean).join(' ') || fallback;
  const isStudent = (author?.role ?? 'Student') === 'Student' && author?.id != null;
  const doctorZone = pathname?.startsWith('/doctor');
  const href = isStudent && (doctorZone || can(user, 'students.view')) ? `${doctorZone ? '/doctor' : ''}/students/${author!.id}` : null;

  return (
    <span className={`inline-flex min-w-0 flex-col ${className}`}>
      {href ? (
        <Link href={href} className={`truncate hover:text-[var(--primary,#2137D6)] hover:underline ${nameClassName}`} title={name}>{name}</Link>
      ) : (
        <span className={`truncate ${nameClassName}`}>{name}</span>
      )}
      {isStudent && author?.phone && (
        <a href={`tel:${author.phone}`} dir="ltr" className="w-max text-xs font-normal text-gray-500 hover:text-[var(--primary,#2137D6)]">{author.phone}</a>
      )}
    </span>
  );
}
