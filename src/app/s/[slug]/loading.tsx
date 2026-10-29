export default function Loading() {
  return (
    <div className="shell pt-8 md:pt-12" aria-busy="true" aria-label="Loading story">
      <div className="max-w-[1000px] space-y-4">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-3/4" />
        <div className="skeleton h-6 w-2/3" />
      </div>
      <div className="skeleton mt-10 aspect-[21/9] w-full" />
    </div>
  );
}
