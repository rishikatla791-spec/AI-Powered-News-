/** Skeleton shaped like the front page so nothing jumps when content arrives. */
export default function Loading() {
  return (
    <div className="shell" aria-busy="true" aria-label="Loading">
      <div className="flex justify-between border-b border-rule py-5">
        <div className="skeleton h-4 w-56" />
        <div className="skeleton hidden h-4 w-72 sm:block" />
      </div>
      <div className="grid gap-10 pt-6 pb-14 lg:grid-cols-12 lg:gap-12">
        <div className="grid gap-6 lg:col-span-9 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-5 lg:pt-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-4/5" />
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-5 w-3/4" />
          </div>
          <div className="skeleton aspect-[3/2] lg:col-span-7" />
        </div>
        <div className="space-y-6 lg:col-span-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
