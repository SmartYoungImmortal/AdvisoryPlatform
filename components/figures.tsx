import { Fragment } from "react";

/**
 * The figures in a mixed string, a Thai date ("3 ส.ค. 2569") or a count
 * ("ยังไม่อ่าน 3 รายการ"), set in the Latin face with tabular digits, and the
 * words around them left in the Thai one.
 *
 * `font-latin` on the whole string is the shortcut it replaces: Geist has no
 * Thai, so the words went to the system's fallback face instead of Noto Sans
 * Thai and sat visibly apart from the rest of the line.
 */
export function Figures({ children }: { readonly children: string }) {
  // `split` with a capture group alternates words and figures, words first.
  // Each run keyed by its kind and where it starts in the string: unique (an
  // empty run of words can share an offset with the figure after it, never its
  // kind), and stable for the same text.
  const runs = children.split(/(\d[\d,.:]*)/).reduce<
    { readonly text: string; readonly start: number; readonly figure: boolean }[]
  >((list, text, index) => {
    const last = list.at(-1);
    list.push({ text, start: last ? last.start + last.text.length : 0, figure: index % 2 === 1 });
    return list;
  }, []);

  return (
    <>
      {runs.map((run) =>
        run.figure ? (
          <span className="font-latin tabular-nums" key={`n${run.start}`}>
            {run.text}
          </span>
        ) : (
          <Fragment key={`w${run.start}`}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
