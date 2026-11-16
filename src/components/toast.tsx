"use client";

import * as React from "react";

type Toast = { id: number; message: string };

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* bottom-24 keeps toasts clear of the mobile bottom nav. z-[100] puts
          them above dialogs: a dialog's overlay is z-50 and comes later in
          the document, so at z-50 a toast raised from inside a dialog — which
          is where most validation errors are raised — was painted under the
          dimmed backdrop and the action looked like it had done nothing.
          Above a dialog a toast is "outside" it, so `data-toast-region` is
          what `DialogContent` checks to keep a tap on a toast from
          dismissing the dialog (and dropping its edits). Toasts still catch
          their own taps rather than passing them through: they share the
          bottom-right corner with the focus pill and the starter page's
          Start bar, and a tap on a message must not press those. */}
      <div
        data-toast-region
        className="pointer-events-none fixed bottom-24 right-4 z-[100] flex flex-col gap-2 md:bottom-6 md:right-6"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground shadow-md"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Whether a pointer event landed on a toast. Toasts are drawn above dialogs
 * and sheets, so to Radix they are "outside" them; the overlay components
 * check this so tapping a message does not dismiss the dialog under it.
 */
export function isToastTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-toast-region]") != null;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
