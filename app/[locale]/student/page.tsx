import ContinueWatchingSection from "@/src/components/student/home/ContinueWatchingSection";
import GetStudentNotes from "@/src/components/student/home/GetStudentNotes";
import LatestPostsSection from "@/src/components/student/home/LatestPostsSection";
import LibrarySection from "@/src/components/student/home/LibrarySection";
import UpcomingLiveClasses from "@/src/components/student/home/LiveSessions";
import MyCoursesSection from "@/src/components/student/home/MyCoursesSection";
import MySubjectSection from "@/src/components/student/home/MySubjectSection";
import NewestExams from "@/src/components/student/home/NewestExams";
import StudentHero from "@/components/student/home/StudentHero";
import StudentSchedulesSection from "@/components/student/home/StudentSchedulesSection";
import { getCategories } from "@/src/services/student/department.service";
import { getLatestStudentExams } from "@/src/services/student/exam.service";
import { getLibrary } from "@/src/services/student/library.service";
import { getLatestStudentPosts } from "@/src/services/student/post.service";
import { getStudentLiveRooms } from "@/src/services/student/live-room.service";
import { getLiveRoomCourseIds } from "@/src/lib/student-live-room";
import {
  isWithinStudentCourses,
  readRowCourseIds,
  studentCourseTitleMap,
} from "@/src/lib/student-course-scope";
import {
  getStudentCourses,
  getStudentData,
  getStudentNotes,
  getStudentProgression,
} from "@/src/services/student/user.service";

export default async function StudentPage() {
  // Independent requests run together (they used to run one after another, so the home page opened slowly).
  const [studentResult, progressResult, coursesResult, liveRoomsResult, notesResult, libraryResult, categoryResult, examsResult] =
    await Promise.all([
      getStudentData(),
      getStudentProgression(),
      getStudentCourses(),
      getStudentLiveRooms(),
      getStudentNotes(),
      getLibrary(),
      getCategories(),
      // A wider page so the hero can count the available exams; the exams section still shows 4.
      getLatestStudentExams(50),
    ]);

  const student = studentResult.success ? studentResult.data?.data?.attributes ?? null : null;
  const progress = progressResult.success ? progressResult.data?.data ?? [] : [];
  const courses = coursesResult.success ? coursesResult.data?.data ?? [] : [];
  const rawLiveSessions = liveRoomsResult.success ? liveRoomsResult.data ?? [] : [];
  const notes = notesResult.success ? notesResult.data?.data ?? [] : [];

  const rawLibrary = libraryResult.success
    ? (Array.isArray(libraryResult.data)
        ? libraryResult.data
        : (libraryResult.data as any)?.data ?? [])
    : [];

  const category = categoryResult.success ? categoryResult.data?.data ?? [] : [];

  const latestExams = examsResult.success ? examsResult.data ?? [] : [];

  // `getStudentCourses` already drops courses that are not active (draft), so
  // this set is the same "enrolled + published course" scope the community
  // page derives on the client.
  const enrolledCourseIds = new Set<string>(
    (courses || []).map((c: { id: string | number }) => String(c.id))
  );
  const courseTitleById = studentCourseTitleMap(courses);

  const postsResult = await getLatestStudentPosts(enrolledCourseIds, 3);
  const latestPosts = postsResult.success ? postsResult.data?.data ?? [] : [];

  // 1. Filter continue watching progress by enrolled courses
  const filteredProgress = (progress || []).filter((p: any) => {
    const cid = p?.attributes?.chapter?.data?.attributes?.course_id;
    return cid != null && enrolledCourseIds.has(String(cid));
  });

  // 2. Filter category tree courses by enrolled courses
  const filteredCategories = (category || []).map((cat: any) => {
    const rawCourses = cat.attributes?.courses || cat.courses || [];
    const filteredCourses = (Array.isArray(rawCourses) ? rawCourses : []).filter(
      (c: any) => enrolledCourseIds.has(String(c.id))
    );
    return {
      ...cat,
      attributes: {
        ...cat.attributes,
        courses: filteredCourses,
        stats: {
          ...cat.attributes?.stats,
          courses: filteredCourses.length,
        },
      },
    };
  });

  // 3. Filter live sessions strictly by enrolled courses
  const filteredLiveSessions = (rawLiveSessions || []).filter((room) => {
    const cids = getLiveRoomCourseIds(room);
    if (cids.length === 0) return false;
    return cids.some((cid) => enrolledCourseIds.has(String(cid)));
  });

  // 4. Filter notes by enrolled courses
  const enrolledNotes = (notes || []).filter(
    (note: { attributes?: { course_id?: string | number | null } }) =>
      note.attributes?.course_id &&
      enrolledCourseIds.has(String(note.attributes.course_id))
  );

  // 5. Filter library materials by enrolled courses. Materials are attached to
  // several courses at once, so the ids live in `course_ids` / `courses` and
  // only older rows carry a single `course_id`.
  const filteredLibrary = rawLibrary.filter((item: unknown) =>
    isWithinStudentCourses(readRowCourseIds(item), enrolledCourseIds)
  );

  // 6. Filter exams by enrolled courses
  const filteredLatestExams = latestExams.filter((exam) => {
    const examCids = [
      ...(exam.courses_ids || []),
      ...(exam.course_id ? [exam.course_id] : []),
    ];
    if (examCids.length === 0) return false;
    return examCids.some((cid) => enrolledCourseIds.has(String(cid)));
  });

  // 7. Community posts: `getLatestStudentPosts` already dropped replies and
  // drafts and scoped what is left to the student's own courses.

  const coursesCount = courses?.length ?? 0;
  const liveSessionsCount = filteredLiveSessions.length;

  return (
    <div className="flex max-w-full flex-col gap-4 sm:gap-6">
      <StudentHero
        coursesCount={coursesCount}
        notesCount={enrolledNotes.length}
        student={student}
        liveSessionsCount={liveSessionsCount}
        examsCount={filteredLatestExams.length}
      />

      <ContinueWatchingSection progress={filteredProgress} />

      <MySubjectSection categories={category} />

      <MyCoursesSection />
      <LatestPostsSection posts={latestPosts} courseTitleById={courseTitleById} />
      <NewestExams exams={filteredLatestExams.slice(0, 4)} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {/* Two aligned rows: live sessions | notes, then schedules | library (each card fills its row) */}
        <div className="min-w-0 [&>*]:!h-full">
          <UpcomingLiveClasses sessions={filteredLiveSessions} />
        </div>
        <div className="min-w-0 [&>*]:!h-full">
          <GetStudentNotes notes={enrolledNotes} />
        </div>
        <div className="min-w-0 [&>*]:!h-full">
          <StudentSchedulesSection />
        </div>
        <div className="min-w-0 [&>*]:!h-full">
          <LibrarySection library={filteredLibrary} />
        </div>
      </div>
    </div>
  );
}

