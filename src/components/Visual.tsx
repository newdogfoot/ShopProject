/** Pictures drawn by code (never by AI): dots, base-ten blocks, number line, arrays, fraction bars. */
import type { Visual } from "@/domain/items/types";

const INK = "#4c3bd1";
const FILL = "#b9a8ff";
const SOFT = "#ece6ff";

function Dots({ count, emoji, groupSize }: { count: number; emoji?: string; groupSize?: number }) {
  const size = groupSize && groupSize > 1 ? groupSize : 0;
  const groups: number[] = [];
  if (size) {
    for (let left = count; left > 0; left -= size) groups.push(Math.min(size, left));
  } else groups.push(count);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3" aria-label={`그림: ${count}개`}>
      {groups.map((g, gi) => (
        <div key={gi} className={`flex max-w-[11rem] flex-wrap justify-center gap-1 ${size ? "rounded-2xl border-2 border-dashed border-brand/40 p-2" : ""}`}>
          {Array.from({ length: g }, (_, i) =>
            emoji ? (
              <span key={i} className="text-2xl leading-none">
                {emoji}
              </span>
            ) : (
              <span key={i} className="inline-block h-5 w-5 rounded-full" style={{ background: FILL, border: `2px solid ${INK}` }} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Blocks({ hundreds, tens, ones }: { hundreds: number; tens: number; ones: number }) {
  return (
    <div className="flex items-end gap-2">
      {Array.from({ length: hundreds }, (_, i) => (
        <svg key={`h${i}`} width="44" height="44" viewBox="0 0 44 44" aria-hidden>
          <rect x="1" y="1" width="42" height="42" fill={FILL} stroke={INK} strokeWidth="2" />
          {Array.from({ length: 9 }, (_, k) => (
            <g key={k}>
              <line x1={1 + (k + 1) * 4.2} y1="1" x2={1 + (k + 1) * 4.2} y2="43" stroke={INK} strokeWidth="0.5" />
              <line x1="1" y1={1 + (k + 1) * 4.2} x2="43" y2={1 + (k + 1) * 4.2} stroke={INK} strokeWidth="0.5" />
            </g>
          ))}
        </svg>
      ))}
      {Array.from({ length: tens }, (_, i) => (
        <svg key={`t${i}`} width="9" height="44" viewBox="0 0 9 44" aria-hidden>
          <rect x="1" y="1" width="7" height="42" fill={FILL} stroke={INK} strokeWidth="1.5" />
          {Array.from({ length: 9 }, (_, k) => (
            <line key={k} x1="1" y1={1 + (k + 1) * 4.2} x2="8" y2={1 + (k + 1) * 4.2} stroke={INK} strokeWidth="0.5" />
          ))}
        </svg>
      ))}
      <div className="flex max-w-[3.2rem] flex-wrap-reverse gap-0.5">
        {Array.from({ length: ones }, (_, i) => (
          <svg key={`o${i}`} width="9" height="9" viewBox="0 0 9 9" aria-hidden>
            <rect x="1" y="1" width="7" height="7" fill={FILL} stroke={INK} strokeWidth="1.5" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function BaseTen(v: Extract<Visual, { type: "base-ten" }>) {
  const label = (b: { hundreds: number; tens: number; ones: number }) => `백 모형 ${b.hundreds}개, 십 모형 ${b.tens}개, 일 모형 ${b.ones}개`;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4" aria-label={v.plus ? `${label(v)} 더하기 ${label(v.plus)}` : label(v)}>
      <Blocks hundreds={v.hundreds} tens={v.tens} ones={v.ones} />
      {v.plus && (
        <>
          <span className="text-3xl font-bold text-brand">+</span>
          <Blocks {...v.plus} />
        </>
      )}
    </div>
  );
}

function NumberLine({ min, max, step, marks = [], jumps = [] }: Extract<Visual, { type: "number-line" }>) {
  const count = Math.min(20, Math.round((max - min) / step));
  const width = 320;
  const x = (v: number) => 16 + ((v - min) / (max - min)) * (width - 32);
  return (
    <svg viewBox={`0 0 ${width} 70`} className="w-full max-w-md" aria-label={`수직선 ${min}부터 ${max}까지`}>
      <line x1="10" y1="45" x2={width - 10} y2="45" stroke={INK} strokeWidth="2" />
      {Array.from({ length: count + 1 }, (_, i) => {
        const v = min + i * step;
        return (
          <g key={i}>
            <line x1={x(v)} y1="39" x2={x(v)} y2="51" stroke={INK} strokeWidth="1.5" />
            <text x={x(v)} y="66" textAnchor="middle" fontSize="11" fill={INK}>
              {Number(v.toFixed(2))}
            </text>
          </g>
        );
      })}
      {marks.map((m, i) => (
        <circle key={i} cx={x(m)} cy="45" r="6" fill="#ff8a3d" stroke={INK} strokeWidth="1.5" />
      ))}
      {jumps.map((j, i) => (
        <path key={i} d={`M ${x(j.from)} 40 Q ${(x(j.from) + x(j.to)) / 2} 8 ${x(j.to)} 40`} fill="none" stroke="#ff8a3d" strokeWidth="2" />
      ))}
    </svg>
  );
}

function ArrayDots({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1.1rem)` }} aria-label={`${rows}줄, 한 줄에 ${cols}개`}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <span key={i} className="h-[1.1rem] w-[1.1rem] rounded-full" style={{ background: FILL, border: `2px solid ${INK}` }} />
      ))}
    </div>
  );
}

/** One whole bar split into `parts` pieces; every bar is drawn the same length so sizes can be compared. */
function Bar({ parts, shaded, offset = 0 }: { parts: number; shaded: number; offset?: number }) {
  const w = 300 / parts;
  return (
    <svg viewBox="0 0 302 34" className="w-full max-w-sm" aria-hidden>
      {Array.from({ length: parts }, (_, i) => (
        <rect key={i} x={1 + i * w} y="1" width={w} height="32" fill={offset + i < shaded ? FILL : SOFT} stroke={INK} strokeWidth="2" />
      ))}
    </svg>
  );
}

function FractionBars({ parts, shaded, bars, compare }: { parts: number; shaded: number; bars?: number; compare?: { parts: number; shaded: number } }) {
  const n = Math.max(1, bars ?? Math.ceil(shaded / parts));
  if (compare) {
    return (
      <div className="flex flex-col items-center gap-1" aria-label={`위 막대는 ${parts}칸 중 ${shaded}칸, 아래 막대는 ${compare.parts}칸 중 ${compare.shaded}칸 색칠`}>
        <Bar parts={parts} shaded={shaded} />
        <span className="text-xs text-muted">
          {parts}칸 중 {shaded}칸
        </span>
        <Bar parts={compare.parts} shaded={compare.shaded} />
        <span className="text-xs text-muted">
          {compare.parts}칸 중 {compare.shaded}칸
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2" aria-label={`막대를 ${parts}칸으로 나누어 ${shaded}칸 색칠`}>
      {Array.from({ length: n }, (_, b) => (
        <Bar key={b} parts={parts} shaded={shaded} offset={b * parts} />
      ))}
    </div>
  );
}

export function VisualView({ visual }: { visual: Visual }) {
  switch (visual.type) {
    case "dots":
      return <Dots {...visual} />;
    case "base-ten":
      return <BaseTen {...visual} />;
    case "number-line":
      return <NumberLine {...visual} />;
    case "array":
      return <ArrayDots rows={visual.rows} cols={visual.cols} />;
    case "fraction-bar":
      return <FractionBars parts={visual.parts} shaded={visual.shaded} bars={visual.bars} compare={visual.compare} />;
  }
}
