const QUOTES = [
  { text: "Discipline finishes what motivation starts.", attribution: "You" },
  { text: "Done is the engine of more.", attribution: "Elizabeth Gilbert" },
  { text: "The work is the reward.", attribution: "Anonymous" },
  { text: "Stop starting. Start finishing.", attribution: "Kanban proverb" },
  { text: "Perfection is the enemy of release.", attribution: "You" },
];

function quoteOfDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  return QUOTES[day % QUOTES.length];
}

export function SidebarQuote() {
  const q = quoteOfDay();
  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-b from-surface to-surface-2 p-4">
      <p className="text-sm font-medium leading-snug text-foreground">
        &ldquo;{q.text}&rdquo;
      </p>
      <p className="mt-2 text-xs text-muted-foreground">— {q.attribution}</p>
      <svg
        viewBox="0 0 200 60"
        className="mt-3 h-12 w-full text-primary/25"
        aria-hidden
      >
        <path
          d="M0 60 L0 42 Q 30 18 60 32 T 120 28 T 200 22 L200 60 Z"
          fill="currentColor"
        />
        <path
          d="M0 60 L0 50 Q 40 35 80 44 T 160 42 T 200 38 L200 60 Z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    </section>
  );
}
