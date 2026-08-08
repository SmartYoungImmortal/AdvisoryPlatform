import { Fragment } from "react";

/**
 * Reproduces Figma's line-breaking for Thai copy.
 *
 * Figma only breaks a Thai string at spaces. Chrome runs ICU dictionary
 * segmentation and will also break *inside* a run, which shifts every wrap point
 * — e.g. "…ให้คำปรึกษา รีวิวแรกจะ / แสดงที่นี่" instead of Figma's
 * "…ให้คำปรึกษา / รีวิวแรกจะแสดงที่นี่". `word-break: keep-all` does not help:
 * Chrome only honours it for CJK. Rendering each space-delimited run as a
 * non-wrapping span is the one reliable way to get Figma's break points.
 *
 * Only use this where the design's break matters — a run wider than its
 * container cannot wrap and will overflow.
 */
export function ThaiText({ children }: { readonly children: string }) {
  const runs = children.split(" ");

  return (
    <>
      {runs.map((run, i) => (
        <Fragment key={`${run}-${i}`}>
          {i > 0 ? " " : null}
          <span className="whitespace-nowrap">{run}</span>
        </Fragment>
      ))}
    </>
  );
}
