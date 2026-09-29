"use client";

/** Last-resort boundary when the root layout itself fails. Keeps dependencies minimal. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "3rem 1.5rem",
          color: "#2a1520",
          background: "#fbf6f7",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: 0 }}>USBA Official is temporarily unavailable</h1>
        <p style={{ maxWidth: "32rem" }}>Please try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0 1.25rem",
            background: "#a8123a",
            color: "#fff",
            border: 0,
            borderRadius: 4,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
