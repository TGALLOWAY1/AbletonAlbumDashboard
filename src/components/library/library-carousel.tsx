"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal shelf of asset cards.
 *
 * Cards keep the same width at every breakpoint — a wider viewport shows more
 * of them rather than stretching each one — and the row bleeds into the page
 * gutter so the next card is partly visible, which is what tells you it
 * scrolls. Chevrons appear on pointer devices only; touch just swipes.
 */
export function LibraryCarousel({
  label,
  children,
  itemClassName = "w-36 sm:w-40",
  className,
}: {
  label: string;
  children: React.ReactNode;
  itemClassName?: string;
  className?: string;
}) {
  const scrollerRef = React.useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(true);

  const updateEdges = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges, children]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const items = React.Children.toArray(children);

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={scrollerRef}
        onScroll={updateEdges}
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, index) => (
          <li key={index} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </li>
        ))}
      </ul>

      {!atStart && (
        <CarouselArrow
          side="left"
          label={`Scroll ${label} backwards`}
          onClick={() => scrollBy(-1)}
        />
      )}
      {!atEnd && (
        <CarouselArrow
          side="right"
          label={`Scroll ${label} forwards`}
          onClick={() => scrollBy(1)}
        />
      )}
    </div>
  );
}

function CarouselArrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-[38%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-md transition-colors hover:text-foreground md:inline-flex",
        side === "left" ? "-left-3" : "-right-3",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
