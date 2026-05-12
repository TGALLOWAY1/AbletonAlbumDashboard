import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const bar = {
    width: 12,
    height: 90,
    background: "#eef0f2",
    border: "1px solid #9ca3af",
    borderRadius: 2,
  } as const;

  const item = {
    width: 70,
    height: 19,
    border: "1px solid #1f2937",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 7,
  } as const;

  const Check = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="#000"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={bar} />
            <div style={bar} />
            <div style={bar} />
            <div style={bar} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ ...item, background: "#5bd9a0" }}>
              <Check />
            </div>
            <div style={{ ...item, background: "#5bd9a0" }}>
              <Check />
            </div>
            <div style={{ ...item, background: "#5bd9a0" }}>
              <Check />
            </div>
            <div style={{ ...item, background: "#525252" }}>
              <div
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  border: "1.5px solid #000",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
