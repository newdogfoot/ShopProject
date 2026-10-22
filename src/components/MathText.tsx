import { Fragment } from "react";
import { parseMarkup } from "@/domain/math/markup";
import { readFractionKo } from "@/domain/math/korean";

/** A stacked fraction, read out correctly by screen readers ("4분의 3"). */
export function Fraction({ whole, n, d }: { whole?: number; n: number; d: number }) {
  return (
    <span className="mx-0.5 inline-flex items-center align-middle" role="math" aria-label={readFractionKo(n, d, whole)}>
      {whole ? <span className="mr-0.5">{whole}</span> : null}
      <span className="inline-flex flex-col items-center text-[0.78em] leading-[1.05]" aria-hidden>
        <span className="px-0.5">{n}</span>
        <span className="h-0 w-full border-t-2 border-current" />
        <span className="px-0.5">{d}</span>
      </span>
    </span>
  );
}

/** Renders math markup: {3/4}, {1 2/3} become stacked fractions; new lines are kept. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {parseMarkup(line).map((seg, i) =>
            seg.type === "text" ? <Fragment key={i}>{seg.text}</Fragment> : <Fraction key={i} whole={seg.whole} n={seg.n} d={seg.d} />,
          )}
        </Fragment>
      ))}
    </span>
  );
}
