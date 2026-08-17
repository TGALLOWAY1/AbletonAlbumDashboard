/**
 * A skeleton shaped like the real landing view rather than a spinner, so the
 * page doesn't jump when the data lands.
 */
export default function LibraryLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-32 rounded-md bg-surface-2" />
          <div className="h-4 w-64 rounded bg-surface-2" />
        </div>
        <div className="h-8 w-24 rounded-md bg-surface-2" />
      </div>

      <div className="h-11 w-full rounded-lg bg-surface-2" />
      <div className="h-11 w-full rounded-lg bg-surface-2" />

      {["Loop Stacks", "Presets"].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded bg-surface-2" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex w-36 shrink-0 flex-col gap-2 sm:w-40"
              >
                <div className="aspect-square w-full rounded-lg bg-surface-2" />
                <div className="h-3.5 w-3/4 rounded bg-surface-2" />
                <div className="h-3 w-1/2 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 rounded bg-surface-2" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[9.5rem] w-44 shrink-0 rounded-lg bg-surface-2 sm:w-48"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
