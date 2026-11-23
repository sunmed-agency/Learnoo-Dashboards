/**
 * Supervisors (مشرفين) are admin accounts the owner limits to some
 * permissions. The backend refuses anything outside them; this file only
 * decides what the dashboard shows. Keys match app/Support/Permissions.php.
 */

export type PermissionKey =
  | 'dashboard.view'
  | 'structure.view' | 'structure.manage' | 'views.manage' | 'exams.manage' | 'live.manage' | 'notes.manage' | 'library.manage' | 'schedules.manage'
  | 'students.view' | 'students.manage' | 'devices.manage' | 'activation.codes' | 'activation.sheet' | 'preactivations.manage' | 'subscriptions.manage'
  | 'community.manage' | 'discussions.manage'
  | 'notifications.send' | 'support.manage' | 'downloads.view';

type UserLike = { attributes?: { permissions?: string[] | null; role?: string } } | null | undefined;

/** Null for owners, full admins and every other role: they are not limited here. */
export function supervisorPermissions(user: UserLike): string[] | null {
  const permissions = user?.attributes?.permissions;
  return user?.attributes?.role === 'Admin' && Array.isArray(permissions) ? permissions : null;
}

export function isSupervisor(user: UserLike): boolean {
  return supervisorPermissions(user) !== null;
}

/** True when the user may use this permission (always true for non-supervisors). `a|b` means either. */
export function can(user: UserLike, key: string): boolean {
  const granted = supervisorPermissions(user);
  if (granted === null) return true;
  return key.split('|').some((k) => granted.includes(k));
}

/** Which permission opens each dashboard page (first matching prefix wins). */
export const PAGE_PERMISSIONS: [prefix: string, permission: string][] = [
  ['/dashboard', 'dashboard.view'],
  ['/departments', 'structure.view'],
  ['/universities', 'structure.view'], ['/faculties', 'structure.view'], ['/centers', 'structure.view'], ['/levels', 'structure.view'],
  ['/courses', 'structure.view'], ['/lectures', 'structure.view'], ['/chapters', 'structure.view'], ['/content-manager', 'structure.view'],
  ['/exams', 'exams.manage'],
  ['/question-bank', 'exams.manage'],
  ['/live-sessions', 'live.manage'],
  ['/notes-summaries', 'notes.manage'],
  ['/electronic-library', 'library.manage'],
  ['/schedules', 'schedules.manage'],
  ['/students', 'students.view'],
  ['/guardians', 'students.view'],
  ['/activity', 'devices.manage'],
  ['/activation', 'activation.codes'], // codes only; sheet activation is in the academic plan
  ['/pre-activations', 'preactivations.manage'],
  ['/subscription-requests', 'subscriptions.manage'],
  ['/community', 'community.manage'],
  ['/discussions', 'discussions.manage'],
  ['/notifications', 'notifications.send'],
  ['/issues', 'support.manage'],
  ['/downloads', 'downloads.view'],
  // Profile settings only; every other settings page is for full admins.
  ['/settings/profile', ''],
];

/** Pages a supervisor can never open (owner / full-admin tools). */
const NEVER_FOR_SUPERVISORS = ['/settings', '/feature-control', '/ota-upload', '/supervisors', '/instructors'];

export function canOpenPage(user: UserLike, pathname: string): boolean {
  if (!isSupervisor(user)) return true;
  const match = PAGE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (match) return match[1] === '' || can(user, match[1]);
  return !NEVER_FOR_SUPERVISORS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Where a supervisor lands: the first page they can open. */
export function supervisorHome(user: UserLike): string {
  const first = PAGE_PERMISSIONS.find(([prefix, permission]) => permission !== '' && can(user, permission) && prefix !== '/universities');
  return first?.[0] ?? '/settings/profile';
}
