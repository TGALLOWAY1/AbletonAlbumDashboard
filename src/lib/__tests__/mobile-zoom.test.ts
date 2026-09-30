import { readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

// "I keep having to pinch the app back to size on my phone" had two causes,
// both of which iOS answers by rescaling the page:
//
//  - Focusing a field whose text is under 16px zooms the page in, and nothing
//    zooms it back out. Client-side navigation keeps the zoom, so every page
//    after it stayed magnified.
//  - Content wider than the screen makes Safari shrink the page to fit it,
//    so the scale jumps between a page that overflows and one that doesn't.
//
// globals.css stops the first by redefining Tailwind's sizes under 16px on
// form fields, for touch screens only. That depends on how Tailwind compiles
// its size utilities, so these tests compile the real stylesheet rather than
// reading the file as text.

const REPO_ROOT = path.resolve(__dirname, "../../..");

function source(file: string) {
  return readFileSync(path.join(REPO_ROOT, file), "utf8");
}

/** The code alone — the comments explain the guards and so name them. */
function code(file: string) {
  return source(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** The app's stylesheet as Tailwind builds it, whitespace collapsed. */
async function buildCss(candidates: string[]) {
  const compiler = await compile(source("src/app/globals.css"), {
    base: path.join(REPO_ROOT, "src/app"),
    loadStylesheet: async (id, base) => {
      const file =
        id === "tailwindcss"
          ? path.join(REPO_ROOT, "node_modules/tailwindcss/index.css")
          : path.resolve(base, id);
      return {
        path: file,
        base: path.dirname(file),
        content: readFileSync(file, "utf8"),
      };
    },
  });
  return compiler.build(candidates).replace(/\s+/g, " ");
}

/** A `rem` or `px` length in px at the default 16px root; NaN otherwise. */
function toPx(length: string) {
  const match = length.match(/^([\d.]+)(rem|px)$/);
  if (!match) return NaN;
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

describe("form fields never make iOS zoom in", () => {
  // The whole fix rests on this: a field can only turn its `text-sm` into
  // 16px if the utility looks its size up rather than baking it in (as
  // `@theme inline` would).
  it.each(["text-xs", "text-sm"])(
    "`%s` reads its size from the theme variable when it applies",
    async (utility) => {
      expect(await buildCss([utility])).toContain(
        `.${utility} { font-size: var(--${utility});`,
      );
    },
  );

  it("touch screens lift fields' small sizes, and floor unsized fields, at 16px", async () => {
    const css = await buildCss([]);
    // In the base layer, so a field's own larger size class still wins.
    const rule = css.match(
      /@layer base \{ @media \(pointer: coarse\) \{ ([^{}]+) \{ ([^{}]+) \} \} \}/,
    );
    expect(rule, "globals.css lost its coarse-pointer field rule").not.toBeNull();
    const [, selectors, body] = rule!;

    expect(selectors.split(",").map((s) => s.trim())).toEqual(
      expect.arrayContaining(["input", "textarea", "select"]),
    );
    const declarations = Object.fromEntries(
      body
        .split(";")
        .map((d) => d.split(":").map((part) => part.trim()))
        .filter(([property]) => property),
    );
    expect(toPx(declarations["--text-xs"])).toBeGreaterThanOrEqual(16);
    expect(toPx(declarations["--text-sm"])).toBeGreaterThanOrEqual(16);
    expect(declarations["font-size"]).toMatch(/^max\((1rem|16px), 1em\)$/);
  });

  // `maximum-scale=1` also stops the focus zoom, by stopping Android users
  // from pinch-zooming at all. It is the tempting wrong fix.
  it("the viewport never stops users pinch-zooming", () => {
    const viewport = code("src/app/layout.tsx").match(
      /export const viewport: Viewport = \{([\s\S]*?)\};/,
    );
    expect(viewport).not.toBeNull();
    expect(viewport![1]).not.toMatch(/maximumScale|userScalable/);
  });
});

describe("rendered notes never widen the page past a phone's screen", () => {
  // One pasted URL or code line in a note made the Notes tab ~700px wider
  // than the phone, and Safari zoomed the page out to fit it.
  it.each(["src/components/markdown-body.tsx", "src/components/notes-editor.tsx"])(
    "%s wraps long words and scrolls code blocks in place",
    (file) => {
      const src = code(file);
      expect(src).toContain("wrap-anywhere");
      expect(src).toContain("[&_pre]:overflow-x-auto");
    },
  );
});
