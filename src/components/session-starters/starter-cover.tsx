"use client";

import { useId, useState } from "react";
import type { SessionStarter } from "@/lib/session-starters";
import { cn } from "@/lib/utils";

/** Original, local artwork: a usable cover even offline or before any uploads. */
export function StarterCover({ starter, className, guide = false }: {
  starter: SessionStarter;
  className?: string;
  guide?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const featured = starter.media.find((m) => m.id === starter.featuredMediaId) ?? starter.media[0];
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const style = starter.visualStyle;
  const isDrum = /drum|play|performance/.test(style);
  const isVocal = /vocal/.test(style);
  const isArchive = /archive|reflect/.test(style);
  const isSample = /sample/.test(style);
  const tint = isVocal ? "#cf5cdd" : isDrum ? "#af7ae9" : isSample ? "#f2a151" : "#4dd5bb";
  const words = starter.name.replace("Drop-Focused Preset Arrangement", "Preset Drop").replace("Drop-Focused Sample Arrangement", "Sample Drop");
  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden rounded-lg bg-[#101b20]", className)}>
      {featured && failedUrl !== featured.url ? (
        // Private signed URLs are already sized originals. Infographics are
        // contained so instructional text is never lost at the card edges.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={featured.url} alt={featured.name || `${starter.name} visual guide`} onError={() => setFailedUrl(featured.url)} className={cn("h-full w-full", featured.kind === "cover" && !guide ? "object-cover" : "object-contain")} />
      ) : (
        <svg viewBox={guide ? "0 0 600 450" : "0 0 600 300"} preserveAspectRatio={guide ? "xMidYMid meet" : "xMidYMid slice"} className="h-full w-full" role="img" aria-label={`${starter.name} ${guide ? "workflow infographic" : "illustrated cover"}`}>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#080d13" /><stop offset="1" stopColor={isVocal ? "#38203d" : isSample ? "#36271d" : "#113333"} /></linearGradient>
            <linearGradient id={`${id}-pad`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ecc6ff" /><stop offset="1" stopColor="#8651d1" /></linearGradient>
            <radialGradient id={`${id}-glow`}><stop stopColor={tint} stopOpacity=".45" /><stop offset="1" stopColor={tint} stopOpacity="0" /></radialGradient>
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#070c12" stopOpacity=".6" /><stop offset=".75" stopColor="#070c12" stopOpacity="0" /></linearGradient>
            <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="16" /></filter>
          </defs>
          <rect width="600" height={guide ? "450" : "300"} fill={`url(#${id}-bg)`} />
          <ellipse cx="445" cy="190" rx="230" ry="170" fill={`url(#${id}-glow)`} />
          <path d="M0 278 L600 45 M0 318 L600 85 M0 358 L600 125" stroke="white" strokeOpacity=".035" />
          {isDrum ? <g transform="translate(318 76) rotate(-15 110 100)">
            <rect x="-24" y="-12" width="270" height="218" rx="20" fill="#06090f" stroke="#4b4a64" strokeWidth="3" />
            <rect x="-10" y="0" width="242" height="20" rx="5" fill="#191c29" />
            {[0, 1, 2, 3].flatMap((row) => [0, 1, 2, 3].map((col) => <rect key={`${row}-${col}`} x={col * 56} y={32 + row * 40} width="46" height="30" rx="5" fill={row === 0 ? ["#f0af6b", "#b7d970", "#d4e794", "#8dd8db"][col] : col > 1 ? "#c77ef0" : `url(#${id}-pad)`} opacity={.65 + ((row + col) % 3) * .15} />))}
            {[0, 1, 2, 3].map((n) => <circle key={n} cx={n * 53 + 18} cy="10" r="5" fill="#62667b" />)}
          </g> : isVocal ? <>
            <g opacity=".8">{Array.from({ length: 100 }, (_, i) => { const h = (Math.sin(i * 1.73) * .5 + .5) * (18 + Math.sin(i / 13) * 13) + 4; return <rect key={i} x={205 + i * 3.9} y={(155 - h).toFixed(3)} width="2" height={(h * 2).toFixed(3)} rx="1" fill={tint} />; })}</g>
            <g transform="translate(438 45)"><rect x="0" y="0" width="59" height="121" rx="28" fill="#242131" stroke="#a88ba7" strokeWidth="2" />{Array.from({ length: 15 }, (_, i) => <path key={i} d={`M5 ${i * 6 + 9} H54`} stroke="#656070" strokeWidth="2" />)}<path d="M-13 83 V109 Q-13 146 29 146 Q72 146 72 109 V83 M29 146 V206 M-1 210 H59" fill="none" stroke="#a198ac" strokeWidth="5" /><circle cx="29" cy="109" r="5" fill={tint} /></g>
          </> : isArchive ? <g transform="translate(297 50)">
            {[0, 1, 2].map((n) => <g key={n} transform={`translate(${n * 21} ${n * 26})`}><rect x="0" y="0" width="212" height="101" rx="8" fill="#13252a" stroke="#4a8b82" strokeOpacity=".55" /><path d={`M13 40 H185 M13 62 H163 M13 81 H174`} stroke="#4cae9b" strokeWidth="5" strokeDasharray="10 6 24 9" opacity=".5" /></g>)}
            <path d="M76 145 V119 Q76 111 85 111 H136 L150 128 H226 Q235 128 235 137 V214 Q235 224 225 224 H86 Q76 224 76 214 Z" fill="#15373a" stroke={tint} strokeWidth="3" /><path d="M83 151 H227 L217 216 H92 Z" fill="#1a4848" />
          </g> : isSample ? <>
            <circle cx="424" cy="153" r="130" fill="#080b11" stroke="#353737" strokeWidth="2" />{[51, 66, 81, 96, 111].map((r) => <circle key={r} cx="424" cy="153" r={r} fill="none" stroke="#4b4238" strokeOpacity=".35" />)}<circle cx="424" cy="153" r="28" fill="#c58242" opacity=".7" /><circle cx="424" cy="153" r="5" fill="#090c10" />
            {Array.from({ length: 110 }, (_, i) => { const h = (Math.sin(i * 2.3) * .5 + .5) * 50 * Math.sin(Math.PI * i / 110) + 3; return <rect key={i} x={230 + i * 3.4} y={(155 - h).toFixed(3)} width="2" height={(h * 2).toFixed(3)} fill="#e99d51" />; })}
          </> : <g>{Array.from({ length: 23 }, (_, i) => <path key={i} d={`M215 ${155 + i * 4} C280 ${235 + i * 3} 305 ${40 + i * 2} 365 ${90 + i * 3} S440 ${232 + i * 3} 510 ${93 + i * 3} S600 ${157 + i * 3} 640 ${90 + i * 3}`} fill="none" stroke={tint} strokeOpacity={.15 + i * .025} strokeWidth="1.5" />)}</g>}
          <rect width="600" height="300" fill={`url(#${id}-shade)`} />
          <foreignObject x="29" y="81" width="260" height="185"><div style={{ fontFamily: "var(--font-geist-sans),sans-serif", color: "#fff", fontSize: words.length > 20 ? 40 : 46, lineHeight: 1.03, fontWeight: 850, letterSpacing: "-2px", fontStyle: "italic", textTransform: "uppercase", maxWidth: 240, textShadow: "0 2px 12px #0008", transform: "rotate(-4deg)" }}>{words}</div></foreignObject>
          <path d="M33 251 Q96 240 171 245" fill="none" stroke={tint} strokeWidth="5" strokeLinecap="round" />
          <text x="31" y="32" fill="white" fillOpacity=".45" fontFamily="sans-serif" fontSize="10" letterSpacing="3">FINISH FIVE / SESSION STARTER</text>
          {guide && <>
            <rect x="0" y="280" width="600" height="170" fill="#0c171b" />
            <path d="M24 280 H576" stroke="white" strokeOpacity=".12" />
            <foreignObject x="24" y="289" width="552" height="159"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontFamily: "var(--font-geist-sans),sans-serif", color: "white" }}>
              {starter.steps.slice(0, 4).map((step, index) => <div key={step.id} style={{ display: "flex", gap: 10, minWidth: 0 }}><span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 25, height: 25, borderRadius: "50%", background: "#78c99422", color: "#93d8a7", fontSize: 14, fontWeight: 700 }}>{index + 1}</span><div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: step.title.length > 80 ? 11 : step.title.length > 40 ? 13 : 15, fontWeight: 650, lineHeight: 1.3 }}>{step.title}</p>{step.title.length <= 40 && step.description.split(/(?<=[.!?])\s/)[0].length <= 120 && <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.4, color: "#acb7b9" }}>{step.description.split(/(?<=[.!?])\s/)[0]}</p>}</div></div>)}
            </div></foreignObject>
          </>}
        </svg>
      )}
    </div>
  );
}
