"use client";

// Last-resort boundary: catches crashes in the root layout itself (e.g. the
// Sidebar's Supabase queries). globals.css and the app fonts may not have
// loaded when this renders, so everything is inlined — no Tailwind classes,
// no component-library imports. Colors mirror the tokens in globals.css so
// the page still looks like Finish Five.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "oklch(0.975 0.008 90)",
          color: "oklch(0.22 0.015 260)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div style={{ maxWidth: "36rem", padding: "1.5rem" }}>
          <h1
            style={{
              margin: "0 0 1rem",
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
            }}
          >
            Something went wrong
          </h1>
          <div
            style={{
              border: "1px solid oklch(0.58 0.22 25 / 0.4)",
              background: "oklch(0.58 0.22 25 / 0.05)",
              borderRadius: "0.875rem",
              padding: "1rem",
              fontSize: "0.875rem",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 500,
                color: "oklch(0.58 0.22 25)",
              }}
            >
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.75rem",
                  color: "oklch(0.48 0.012 260)",
                }}
              >
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                height: "2.25rem",
                padding: "0 1rem",
                border: "none",
                borderRadius: "0.625rem",
                background: "oklch(0.58 0.15 150)",
                color: "oklch(0.99 0 0)",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            {/* Deliberately a plain <a>, not next/link: the root layout has
                crashed, so client-side navigation would re-enter the broken
                tree. A full-document load is the recovery path. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "2.25rem",
                padding: "0 1rem",
                borderRadius: "0.625rem",
                color: "oklch(0.22 0.015 260)",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
