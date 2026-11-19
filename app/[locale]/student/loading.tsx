// Shown right away while a student page loads its data, so a tap on the menu feels instant.
export default function StudentLoading() {
  return (
    <div className="flex max-w-full animate-pulse flex-col gap-4 sm:gap-6" aria-busy="true" aria-live="polite">
      <div className="h-44 rounded-[28px] bg-gradient-to-l from-[#1F33C4]/25 via-[#2D46E8]/15 to-[#E8766A]/15 sm:h-52" />
      <div className="rounded-2xl border border-[#E6EAF6] bg-white p-5">
        <div className="h-5 w-40 rounded-full bg-[#EAEEFE]" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-[#F4F6FD]" />)}
        </div>
      </div>
      <div className="rounded-2xl border border-[#E6EAF6] bg-white p-5">
        <div className="h-5 w-32 rounded-full bg-[#EAEEFE]" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-40 rounded-2xl bg-[#F4F6FD]" />)}
        </div>
      </div>
    </div>
  );
}
