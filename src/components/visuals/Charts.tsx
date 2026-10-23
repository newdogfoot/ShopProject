/** Data pictures: bar and line graphs, picture graphs, tables, band and circle graphs. */
import type { Visual } from "@/domain/items/types";
import { ACCENT, FILL, GRID, INK, MUTED, SOFT } from "./palette";

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Which grid lines get a number: all of them when there are few, otherwise every fifth. */
function labelled(k: number, lines: number): boolean {
  return lines <= 10 || k % 5 === 0 || k === lines;
}

function Axes({ left, top, width, height, lines, valueAt, unit }: { left: number; top: number; width: number; height: number; lines: number; valueAt: (k: number) => number; unit?: string }) {
  return (
    <g>
      {Array.from({ length: lines + 1 }, (_, k) => {
        const y = r1(top + height - (height * k) / lines);
        return (
          <g key={k}>
            <line x1={left} y1={y} x2={left + width} y2={y} stroke={GRID} strokeWidth={k === 0 ? 0 : 1} />
            {labelled(k, lines) && (
              <text x={left - 6} y={y} textAnchor="end" dominantBaseline="central" fontSize="11" fill={INK}>
                {valueAt(k)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={left} y1={top} x2={left} y2={top + height} stroke={INK} strokeWidth="1.5" />
      <line x1={left} y1={top + height} x2={left + width} y2={top + height} stroke={INK} strokeWidth="1.5" />
      {unit && (
        <text x={left - 6} y={top - 12} textAnchor="end" fontSize="11" fill={MUTED}>
          ({unit})
        </text>
      )}
    </g>
  );
}

function Title({ text, width }: { text?: string; width: number }) {
  if (!text) return null;
  return (
    <text x={width / 2} y="16" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>
      {text}
    </text>
  );
}

export function BarChart({ title, categories, values, step, max, unit }: Extract<Visual, { type: "bar-chart" }>) {
  const W = 340;
  const H = 240;
  const left = 42;
  const top = 40;
  const width = W - left - 12;
  const height = H - top - 34;
  const lines = Math.max(1, Math.round(max / step));
  const slot = width / categories.length;
  const barW = Math.min(44, slot * 0.56);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={`${title ?? "막대그래프"}: 세로 눈금 한 칸은 ${step}${unit ?? ""}`}>
      <Title text={title} width={W} />
      <Axes left={left} top={top} width={width} height={height} lines={lines} valueAt={(k) => k * step} unit={unit} />
      {categories.map((c, i) => {
        const h = r1((height * values[i]) / max);
        const x = r1(left + slot * i + (slot - barW) / 2);
        return (
          <g key={i}>
            <rect x={x} y={r1(top + height - h)} width={r1(barW)} height={h} fill={FILL} stroke={INK} strokeWidth="1.5" />
            <text x={r1(left + slot * i + slot / 2)} y={top + height + 16} textAnchor="middle" fontSize="12" fill={INK}>
              {c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ title, labels, values, min, max, step, unit }: Extract<Visual, { type: "line-chart" }>) {
  const W = 340;
  const H = 240;
  const left = 46;
  const top = 40;
  const width = W - left - 14;
  const height = H - top - 34;
  const broken = min > 0;
  // With a wavy break, the first grid line is `min`; the gap below it stands for 0…min.
  const base = broken ? 18 : 0;
  const lines = Math.max(1, Math.round((max - min) / step));
  const y = (v: number) => r1(top + (height - base) - ((height - base) * (v - min)) / (max - min));
  const slot = width / labels.length;
  const x = (i: number) => r1(left + slot * i + slot / 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={`${title ?? "꺾은선그래프"}: 세로 눈금 한 칸은 ${step}${unit ?? ""}`}>
      <Title text={title} width={W} />
      {Array.from({ length: lines + 1 }, (_, k) => {
        const v = min + k * step;
        return (
          <g key={k}>
            <line x1={left} y1={y(v)} x2={left + width} y2={y(v)} stroke={GRID} />
            {labelled(k, lines) && (
              <text x={left - 6} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize="11" fill={INK}>
                {v}
              </text>
            )}
          </g>
        );
      })}
      {broken && (
        <>
          <text x={left - 6} y={top + height} textAnchor="end" dominantBaseline="central" fontSize="11" fill={INK}>
            0
          </text>
          <path
            d={`M ${left - 6} ${top + height - 6} q 3 -3 6 0 t 6 0 M ${left - 6} ${top + height - 11} q 3 -3 6 0 t 6 0`}
            fill="white"
            stroke={INK}
            strokeWidth="1.2"
          />
        </>
      )}
      <line x1={left} y1={top} x2={left} y2={top + height} stroke={INK} strokeWidth="1.5" />
      <line x1={left} y1={top + height} x2={left + width} y2={top + height} stroke={INK} strokeWidth="1.5" />
      {unit && (
        <text x={left - 6} y={top - 12} textAnchor="end" fontSize="11" fill={MUTED}>
          ({unit})
        </text>
      )}
      <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={ACCENT} stroke={INK} strokeWidth="1" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={top + height + 16} textAnchor="middle" fontSize="11" fill={INK}>
          {l}
        </text>
      ))}
    </svg>
  );
}

export function Pictograph({ title, rows, icon, big, small, unit = "" }: Extract<Visual, { type: "pictograph" }>) {
  return (
    <figure className="w-full max-w-md" aria-label={`${title ?? "그림그래프"}: 큰 그림은 ${big}${unit}, 작은 그림은 ${small}${unit}`}>
      {title && <figcaption className="mb-2 text-center text-sm font-bold">{title}</figcaption>}
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => {
            const bigCount = Math.floor(row.value / big);
            const smallCount = Math.round((row.value - bigCount * big) / small);
            return (
              <tr key={row.label}>
                <th className="w-20 border border-brand/30 bg-brand-soft/50 px-2 py-1.5 font-bold">{row.label}</th>
                <td className="border border-brand/30 px-2 py-1">
                  <span className="flex flex-wrap items-end gap-0.5" aria-hidden>
                    {Array.from({ length: bigCount }, (_, i) => (
                      <span key={`b${i}`} className="text-[1.7rem] leading-none">
                        {icon}
                      </span>
                    ))}
                    {Array.from({ length: smallCount }, (_, i) => (
                      <span key={`s${i}`} className="text-base leading-none">
                        {icon}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 flex items-end justify-end gap-3 text-sm">
        <span className="flex items-end gap-1">
          <span className="text-[1.7rem] leading-none">{icon}</span> {big}
          {unit}
        </span>
        <span className="flex items-end gap-1">
          <span className="text-base leading-none">{icon}</span> {small}
          {unit}
        </span>
      </p>
    </figure>
  );
}

export function DataTable({ title, header, rows }: Extract<Visual, { type: "table" }>) {
  return (
    <figure className="w-full max-w-md overflow-x-auto">
      {title && <figcaption className="mb-2 text-center text-sm font-bold">{title}</figcaption>}
      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} scope="col" className="border border-brand/30 bg-brand-soft/60 px-2 py-1.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) =>
                c === 0 ? (
                  <th key={c} scope="row" className="border border-brand/30 bg-brand-soft/30 px-2 py-1.5 font-bold">
                    {cell}
                  </th>
                ) : (
                  <td key={c} className="border border-brand/30 px-2 py-1.5 tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const SLICE_FILLS = ["#b9a8ff", "#ffd29d", "#a8e6cf", "#ffb3c1", "#a0d2ff", "#e9e4a6"];

export function RatioGraph({ style, title, items, hidePercents }: Extract<Visual, { type: "ratio-graph" }>) {
  const label = (it: { label: string; percent: number }) => (hidePercents ? it.label : `${it.label} (${it.percent}%)`);
  // Where each item starts, in percent of the whole.
  const starts = items.map((_, i) => items.slice(0, i).reduce((sum, it) => sum + it.percent, 0));
  if (style === "band") {
    const W = 340;
    const left = 12;
    const width = W - 2 * left;
    return (
      <svg viewBox={`0 0 ${W} 112`} className="w-full max-w-md" role="img" aria-label={`${title ?? "띠그래프"}: ${items.map(label).join(", ")}`}>
        <Title text={title} width={W} />
        {Array.from({ length: 11 }, (_, k) => {
          const x = r1(left + (width * k) / 10);
          return (
            <g key={k}>
              <line x1={x} y1="38" x2={x} y2="46" stroke={INK} strokeWidth="1" />
              <text x={x} y="33" textAnchor="middle" fontSize="9" fill={MUTED}>
                {k * 10}
              </text>
            </g>
          );
        })}
        {items.map((it, i) => {
          const x = r1(left + (width * starts[i]) / 100);
          const w = r1((width * it.percent) / 100);
          return (
            <g key={i}>
              <rect x={x} y="46" width={w} height="40" fill={SLICE_FILLS[i % SLICE_FILLS.length]} stroke={INK} strokeWidth="1.5" />
              {it.percent >= 10 ? (
                <text x={r1(x + w / 2)} y="66" textAnchor="middle" dominantBaseline="central" fontSize="10.5" fontWeight="700" fill={INK}>
                  <tspan x={r1(x + w / 2)} dy={hidePercents ? 0 : -6}>
                    {it.label}
                  </tspan>
                  {!hidePercents && (
                    <tspan x={r1(x + w / 2)} dy="13">
                      {it.percent}%
                    </tspan>
                  )}
                </text>
              ) : (
                <text x={r1(x + w / 2)} y="100" textAnchor="middle" fontSize="9.5" fill={INK}>
                  {hidePercents ? it.label : `${it.label} ${it.percent}%`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }
  const C = 120;
  const R = 86;
  const at = (pct: number, r: number) => {
    const a = (pct / 100) * 2 * Math.PI;
    return { x: r1(C + r * Math.sin(a)), y: r1(C + 10 - r * Math.cos(a)) };
  };
  return (
    <svg viewBox="0 0 240 250" className="w-64 max-w-full" role="img" aria-label={`${title ?? "원그래프"}: ${items.map(label).join(", ")}`}>
      <Title text={title} width={240} />
      {items.map((it, i) => {
        const from = at(starts[i], R);
        const to = at(starts[i] + it.percent, R);
        const middle = at(starts[i] + it.percent / 2, R * 0.6);
        const large = it.percent > 50 ? 1 : 0;
        return (
          <g key={i}>
            <path d={`M ${C} ${C + 10} L ${from.x} ${from.y} A ${R} ${R} 0 ${large} 1 ${to.x} ${to.y} Z`} fill={SLICE_FILLS[i % SLICE_FILLS.length]} stroke={INK} strokeWidth="1.5" />
            {it.percent >= 8 && (
              <text x={middle.x} y={middle.y} textAnchor="middle" dominantBaseline="central" fontSize="10.5" fontWeight="700" fill={INK}>
                <tspan x={middle.x} dy={hidePercents ? 0 : -6}>
                  {it.label}
                </tspan>
                {!hidePercents && (
                  <tspan x={middle.x} dy="13">
                    {it.percent}%
                  </tspan>
                )}
              </text>
            )}
          </g>
        );
      })}
      {Array.from({ length: 20 }, (_, k) => {
        const a = at(k * 5, R);
        const b = at(k * 5, R + (k % 2 === 0 ? 7 : 4));
        return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth="1" />;
      })}
      <circle cx={C} cy={C + 10} r={R} fill="none" stroke={INK} strokeWidth="2" />
      <circle cx={C} cy={C + 10} r="2" fill={SOFT} />
    </svg>
  );
}
