'use client';

import { BookOpen, ExternalLink, Globe, Loader2, MessageSquare, Plus, ThumbsUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StudentCommunityCreatePostModal from '@/components/student/community/StudentCommunityCreatePostModal';
import StudentCommunityPostComments from '@/components/student/community/StudentCommunityPostComments';
import { AuthorRoleBadge } from '@/components/student/AuthorRoleBadge';
import { communityPostRelativeTime, communityPostTypeBadgeClasses } from '@/src/lib/community-post-display';
import { pickPostImageUrl } from '@/src/lib/community-post-media';
import { useCreateComment } from '@/src/hooks/useComments';
import { useCreatePost, usePosts, useReactToPost } from '@/src/hooks/usePosts';
import { useCourses } from '@/src/hooks/useCourses';
import {
  isCommunityCommentRow,
  isCommunityPublishedRow,
  readCommunityPostCourseNames,
} from '@/src/lib/student-community-posts';
import { studentCourseTitleMap } from '@/src/lib/student-course-scope';
import { useAuth } from '@/src/stores/authStore';
import type { Course, CreatePostRequest, Post, SocialLink } from '@/src/types';

const POST_TIME_AGO_PREFIX = 'community.posts.timeAgo';

export type StudentCommunityFeedProps = {
  /** Scope posts & social GETs to this course; new posts send `course_id`. */
  courseId?: number;
  /** Hide page-level heading (e.g. embedded in course details tab). */
  embedded?: boolean;
  /** Main community page: list posts/social via GET only (no create, reply, or react). */
  readOnly?: boolean;
  /** From GET /v1/course/:id `social-links` only (no separate social-link list API). */
  socialLinksFromCourse?: SocialLink[];
  /** From GET /v1/course/:id `posts` only (no separate posts list API). */
  postsFromCourse?: Post[];
  /** Refetch course details after create / reply / react when using `postsFromCourse`. */
  onPostsRefresh?: () => void | Promise<void>;
};

type FeedTab = 'all' | 'post' | 'summary' | 'question';

/**
 * A post that belongs in the feed. Replies are never rendered as posts — the
 * parent reference has been sent under several names, so `isCommunityCommentRow`
 * checks all of them — and a draft is visible only to the student who wrote it.
 */
function isVisibleRootPost(p: Post, userId: string | undefined): boolean {
  if (isCommunityCommentRow(p)) return false;
  if (isCommunityPublishedRow(p)) return true;
  return userId != null && String(p.attributes.user?.data.id) === String(userId);
}


function isLikelyInstructorRole(role: string | undefined): boolean {
  if (!role?.trim()) return false;
  const r = role.trim().toLowerCase();
  return (
    r.includes('instructor') ||
    r.includes('doctor') ||
    r.includes('teacher') ||
    r.includes('faculty') ||
    r === 'admin'
  );
}

function SocialLinkCard({ link, joinLabel }: { link: SocialLink; joinLabel: string }) {
  const bg = link.attributes.color?.trim() || '#16A34A';
  const href = link.attributes.link?.trim();
  const inactive = link.attributes.status === false;

  const inner = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: link.attributes.icon ? 'transparent' : bg }}
        >
          {link.attributes.icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote API icon URLs
            <img src={link.attributes.icon} alt="" className="size-full object-cover" />
          ) : (
            <Globe className="size-5 text-white" aria-hidden />
          )}
        </div>
        <ExternalLink className="size-4 shrink-0 text-white/90" aria-hidden />
      </div>
      <h3 className="text-[15px] font-bold leading-snug text-white sm:text-base">{link.attributes.title}</h3>
      {link.attributes.subtitle?.trim() ? (
        <p className="mt-1 text-[13px] leading-snug text-white/85">{link.attributes.subtitle}</p>
      ) : null}
      <p className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-medium text-white/90">
        <span>{joinLabel}</span>
        <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
      </p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex min-h-[148px] flex-col rounded-2xl p-5 text-start shadow-md transition sm:min-h-[156px] sm:p-6 ${inactive ? 'pointer-events-none opacity-60' : 'hover:opacity-95 hover:shadow-lg'}`}
        style={{ backgroundColor: bg }}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      className={`flex min-h-[148px] flex-col rounded-2xl p-5 sm:min-h-[156px] sm:p-6 ${inactive ? 'opacity-60' : 'opacity-80'}`}
      style={{ backgroundColor: bg }}
    >
      {inner}
    </div>
  );
}

export default function StudentCommunityFeed({
  courseId,
  embedded = false,
  readOnly = false,
  socialLinksFromCourse,
  postsFromCourse,
  onPostsRefresh,
}: StudentCommunityFeedProps = {}) {
  const locale = useLocale();
  const { user: currentUser } = useAuth();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const t = useTranslations();
  const tPage = useTranslations('courses.studentCommunity');
  const scopedCourseId =
    courseId !== undefined && Number.isFinite(courseId) && courseId > 0 ? courseId : undefined;
  const useCoursePosts = postsFromCourse !== undefined;
  const {
    data: postsFetched,
    isLoading: postsLoadingFetched,
    error: postsErrorFetched,
    refetch: refetchPostsFetched,
  } = usePosts(scopedCourseId != null ? scopedCourseId : null, { enabled: !useCoursePosts });
  const postsRaw = useCoursePosts ? postsFromCourse : postsFetched;
  const postsLoading = useCoursePosts ? false : postsLoadingFetched;
  const postsError = useCoursePosts ? null : postsErrorFetched;
  const refetchPosts = useCallback(async () => {
    if (useCoursePosts && onPostsRefresh) {
      await onPostsRefresh();
      return;
    }
    await refetchPostsFetched();
  }, [useCoursePosts, onPostsRefresh, refetchPostsFetched]);
  const { mutate: createPost, isLoading: isCreating } = useCreatePost();
  const { mutate: createComment, isLoading: isReplying } = useCreateComment();
  const { mutate: reactToPost } = useReactToPost();

  const { data: allCourses } = useCourses();
  // The posts list does not always inline the `courses` relation; when it only
  // sends the ids, the course name on a post card is resolved from here.
  const courseTitleById = useMemo(() => studentCourseTitleMap(allCourses), [allCourses]);
  const draftCourseIds = useMemo(() => {
    if (!allCourses) return new Set<number>();
    return new Set<number>(
      allCourses
        .filter((c: Course) => c.attributes.status === 0)
        .map((c: Course) => parseInt(c.id)),
    );
  }, [allCourses]);

  const [tab, setTab] = useState<FeedTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Post | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);
  /** Per post: the comment the student just posted, so its list can show it. */
  const [postedCommentIds, setPostedCommentIds] = useState<Record<string, string>>({});

  const socialLinks = socialLinksFromCourse ?? [];

  const topPosts = useMemo(() => {
    const list = postsRaw ?? [];
    let roots = list.filter(p => isVisibleRootPost(p, currentUser?.id));
    if (scopedCourseId != null) {
      roots = roots.filter(
        (p) =>
          p.attributes.course_id == null ||
          Number(p.attributes.course_id) === scopedCourseId,
      );
    }
    roots = roots.filter(
      (p) =>
        p.attributes.course_id == null ||
        !draftCourseIds.has(Number(p.attributes.course_id)),
    );
    return [...roots].sort((a, b) => {
      const ta = new Date(a.attributes.created_at || 0).getTime();
      const tb = new Date(b.attributes.created_at || 0).getTime();
      return tb - ta;
    });
  }, [postsRaw, scopedCourseId, draftCourseIds, currentUser?.id]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    if (id && /^\d+$/.test(id)) requestAnimationFrame(() => document.getElementById(`post-${id}`)?.scrollIntoView({ block: 'center' }));
  }, [topPosts]);

  const filteredPosts = useMemo(() => {
    if (tab === 'all') return topPosts;
    return topPosts.filter((p) => p.attributes.type === tab);
  }, [topPosts, tab]);

  const tabs = useMemo(
    () =>
      [
        { key: 'all' as const, label: tPage('tabAll') },
        { key: 'post' as const, label: tPage('tabPosts') },
        { key: 'summary' as const, label: tPage('tabSummaries') },
        { key: 'question' as const, label: tPage('tabQuestions') },
      ],
    [tPage],
  );

  const timeLabel = useCallback(
    (iso: string) => communityPostRelativeTime(iso, t, POST_TIME_AGO_PREFIX),
    [t],
  );

  const handleCreate = useCallback(
    async (payload: CreatePostRequest) => {
      try {
        await createPost({
          ...payload,
          ...(scopedCourseId != null ? { course_id: scopedCourseId } : {}),
        });
        setModalOpen(false);
        setReplyTarget(null);
        toast.success(tPage('toastCreated'));
        await refetchPosts();
      } catch {
        toast.error(tPage('toastCreateFailed'));
      }
    },
    [createPost, refetchPosts, tPage, scopedCourseId],
  );

  const handleSubmitReply = useCallback(
    async (parentId: string, payload: { content: string; tags?: string[] }) => {
      const pid = Number.parseInt(parentId, 10);
      if (!Number.isFinite(pid)) {
        toast.error(tPage('toastReplyFailed'));
        return;
      }
      try {
        const created = await createComment(pid, {
          content: payload.content,
          ...(payload.tags?.length ? { tags: payload.tags } : {}),
        });
        setModalOpen(false);
        setReplyTarget(null);
        toast.success(tPage('toastReplyCreated'));
        await refetchPosts();
        const createdId = (created as { id?: string | number } | null)?.id;
        if (createdId != null) {
          setPostedCommentIds((prev) => ({ ...prev, [parentId]: String(createdId) }));
        }
      } catch {
        toast.error(tPage('toastReplyFailed'));
      }
    },
    [createComment, refetchPosts, tPage],
  );

  const openCreateModal = useCallback(() => {
    setReplyTarget(null);
    setModalOpen(true);
  }, []);

  const openReplyModal = useCallback((post: Post) => {
    setReplyTarget(post);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isCreating || isReplying) return;
    setModalOpen(false);
    setReplyTarget(null);
  }, [isCreating, isReplying]);

  const handleReact = useCallback(
    async (post: Post, type: string = 'like') => {
      const id = String(post.id);
      setReactingId(id);
      try {
        await reactToPost(parseInt(id, 10), { type });
        await refetchPosts();
      } catch {
        toast.error(tPage('toastReactFailed'));
      } finally {
        setReactingId(null);
      }
    },
    [reactToPost, refetchPosts, tPage],
  );

  const modalReplyTarget = useMemo(
    () =>
      replyTarget
        ? { id: String(replyTarget.id), title: replyTarget.attributes.title }
        : null,
    [replyTarget],
  );

  const feedWidth = embedded ? '' : 'mx-auto w-full max-w-[680px]';

  return (
    <div className={`w-full ${embedded ? 'pb-6 pt-0' : 'pb-12 pt-2'}`} dir={dir}>
      {!embedded ? (
        <header className={`mb-6 ${feedWidth}`}>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">{tPage('pageTitle')}</h1>
          <p className="mt-2 text-sm text-[#64748B] sm:text-base">{tPage('pageSubtitle')}</p>
        </header>
      ) : (
        <header className="mb-6 max-w-4xl">
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">{tPage('pageTitle')}</h2>
          <p className="mt-1.5 text-sm text-[#64748B]">{tPage('pageSubtitle')}</p>
        </header>
      )}

      {embedded ? (
        <section className="mb-8" aria-labelledby="course-social-links-heading">
          <h3 id="course-social-links-heading" className="sr-only">
            {tPage('socialSectionTitle')}
          </h3>
          {socialLinks.length === 0 ? (
            <p className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
              {tPage('socialEmpty')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {socialLinks.map((link) => (
                <SocialLinkCard key={link.id} link={link} joinLabel={tPage('socialJoinCta')} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className={`mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${feedWidth}`}>
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex min-w-max flex-nowrap items-center gap-2">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-pressed={tab === item.key}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.key
                  ? 'bg-[var(--primary)] text-white shadow-[0_8px_18px_-10px_rgba(45,70,232,0.8)]'
                  : 'bg-white text-[#475569] ring-1 ring-[#E6EAF6] hover:bg-[#EAEEFE] hover:text-[var(--primary)]'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {/* {!readOnly ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a2bb3]"
          >
            <Plus className="size-4" aria-hidden />
            {tPage('createPost')}
          </button>
        ) : null} */}
      </div>

      {postsError ? (
        <p className={`mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 ${feedWidth}`}>{tPage('postsError')}</p>
      ) : null}

      {/* Spinner on the first load only: refreshing after a comment or a like
          keeps the posts (and the reader's place on the page) where they are. */}
      {postsLoading && !postsRaw ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-10 animate-spin text-[#2137D6]" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <p className={`rounded-2xl border border-[#E6EAF6] bg-white px-6 py-12 text-center text-sm text-[#64748B] ${feedWidth}`}>
          {tPage('postsEmpty')}
        </p>
      ) : (
        <ul className={`flex flex-col gap-4 ${feedWidth}`}>
          {filteredPosts.map((post) => {
            const user = post.attributes.user?.data.attributes;
            const userInitial = user?.first_name?.[0] || user?.full_name?.[0] || '?';
            const userName = user?.full_name || user?.first_name || t('community.posts.unknownUser');
            const instructor = isLikelyInstructorRole(user?.role);
            const typeKey = post.attributes.type;
            const typeLabel = t(`community.posts.type.${typeKey}`);
            const comments = post.attributes.comments_count ?? 0;
            const reactions = post.attributes.reactions_count ?? 0;
            const liked = Boolean(post.attributes.user_reaction);
            const tags = post.attributes.tags ?? [];
            const postImageSrc = pickPostImageUrl(post.attributes);
            const courseNames = readCommunityPostCourseNames(post, courseTitleById);

            return (
              <li
                id={`post-${post.id}`}
                key={post.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(10,16,51,0.05),0_12px_32px_-22px_rgba(45,70,232,0.35)] ${instructor ? 'border-amber-200' : 'border-[#E6EAF6]'}`}
              >
                {instructor ? <div className="h-1 bg-gradient-to-l from-amber-400 to-[#E8766A]" aria-hidden /> : null}

                {/* Author */}
                <div className="px-4 pt-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D46E8] to-[#E8766A] text-base font-bold text-white shadow-sm ring-2 ring-white">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-bold text-[#0A1033]">{userName}</span>
                        <AuthorRoleBadge role={user?.role} />
                        {post.attributes.status === 'draft' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{t('courses.pending')}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#94A3B8]">
                        <span>{timeLabel(post.attributes.created_at || '')}</span>
                        <span aria-hidden>·</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide ${communityPostTypeBadgeClasses(typeKey)}`}>
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {courseNames.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {courseNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full bg-[#EAEEFE] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary)]"
                        >
                          <BookOpen className="size-3 shrink-0" aria-hidden />
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {post.attributes.title ? (
                    <h3 className="mt-3 text-base font-bold text-[#0A1033] sm:text-[17px]">{post.attributes.title}</h3>
                  ) : null}
                  {post.attributes.content ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-7 text-[#334155]">{post.attributes.content}</p>
                  ) : null}

                  {tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span key={tag} className="text-[13px] font-semibold text-[var(--primary)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Image: full card width, opens the original */}
                {postImageSrc ? (
                  <a
                    href={postImageSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block border-y border-[#EEF1F8] bg-[#F4F6FD]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote API URLs */}
                    <img
                      src={postImageSrc}
                      alt={post.attributes.title || ''}
                      loading="lazy"
                      className="mx-auto max-h-[70dvh] w-full object-contain"
                    />
                  </a>
                ) : null}

                <div className="px-4 sm:px-5">
                  {/* Counts */}
                  <div className="flex items-center justify-between gap-3 border-b border-[#EEF1F8] py-2.5 text-[13px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1.5" aria-label={`${tPage('like')}: ${reactions}`}>
                      <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[#5B73FF] text-white">
                        <ThumbsUp className="size-3" fill="currentColor" aria-hidden />
                      </span>
                      {reactions}
                    </span>
                    {/* The comments count lives on the comments toggle below, so it is not repeated here */}
                  </div>

                  {/* Actions */}
                  {readOnly ? null : (
                    <div className="grid grid-cols-2 gap-1 border-b border-[#EEF1F8] py-1">
                      <button
                        type="button"
                        onClick={() => void handleReact(post)}
                        disabled={reactingId !== null}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition hover:bg-[#F4F6FD] disabled:opacity-50 ${liked ? 'text-[var(--primary)]' : 'text-[#475569]'}`}
                        aria-pressed={liked}
                      >
                        <ThumbsUp className="size-[18px] shrink-0" strokeWidth={2} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                        {tPage('like')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openReplyModal(post)}
                        disabled={isCreating || isReplying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#F4F6FD] hover:text-[var(--primary)] disabled:opacity-50"
                      >
                        <MessageSquare className="size-[18px] shrink-0" aria-hidden />
                        {tPage('addComment')}
                      </button>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="pb-3">
                    <StudentCommunityPostComments
                      postId={post.id}
                      commentsCount={comments}
                      readOnly={readOnly}
                      onRefresh={refetchPosts}
                      revealCommentId={postedCommentIds[String(post.id)] ?? null}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly ? (
        <StudentCommunityCreatePostModal
          open={modalOpen}
          onClose={closeModal}
          isSubmitting={isCreating || isReplying}
          replyTarget={modalReplyTarget}
          onSubmitPost={handleCreate}
          onSubmitReply={handleSubmitReply}
        />
      ) : null}
    </div>
  );
}
