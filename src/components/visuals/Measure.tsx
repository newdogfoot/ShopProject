/** Measuring pictures: clock, ruler and angle (with a protractor). */
import type { Visual } from "@/domain/items/types";
import { clockHands, describeClock } from "@/domain/visual/clock";
import { ACCENT, FILL, INK, MUTED } from "./palette";

const rad = (deg: number) => (deg * Math.PI) / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;

export function Clock({ hour, minute }: Extract<Visual, { type: "clock" }>) {
  const hands = clockHands(hour, minute);
  // Clock angles are clockwise from 12.
  const at = (deg: number, r: number) => ({ x: r1(100 + r * Math.sin(rad(deg))), y: r1(100 - r * Math.cos(rad(deg))) });
  const hourEnd = at(hands.hour, 46);
  const minuteEnd = at(hands.minute, 72);
  return (
    <svg viewBox="0 0 200 200" className="w-52 max-w-full" role="img" aria-label={describeClock(hour, minute)}>
      <circle cx="100" cy="100" r="93" fill="white" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const a = at(i * 6, 90);
        const b = at(i * 6, big ? 80 : 85);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={big ? 2.5 : 1} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const p = at(n * 30, 67);
        return (
          <text key={n} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill={INK}>
            {n}
          </text>
        );
      })}
      <line x1="100" y1="100" x2={hourEnd.x} y2={hourEnd.y} stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <line x1="100" y1="100" x2={minuteEnd.x} y2={minuteEnd.y} stroke={ACCENT} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill={INK} />
    </svg>
  );
}

function cmText(v: number): string {
  return String(Math.round(v * 10) / 10);
}

export function Ruler({ max, from, to }: Extract<Visual, { type: "ruler" }>) {
  const per = 286 / max;
  const x = (cm: number) => r1(16 + cm * per);
  const showMm = per >= 20;
  return (
    <svg viewBox="0 0 334 100" className="w-full max-w-md" role="img" aria-label={`자 위에 막대가 ${cmText(from)} 눈금에서 ${cmText(to)} 눈금까지 놓여 있어요`}>
      <rect x={x(from)} y="14" width={r1((to - from) * per)} height="18" rx="5" fill={ACCENT} stroke={INK} strokeWidth="1.5" />
      <line x1={x(from)} y1="32" x2={x(from)} y2="46" stroke={INK} strokeDasharray="3 3" />
      <line x1={x(to)} y1="32" x2={x(to)} y2="46" stroke={INK} strokeDasharray="3 3" />
      <rect x="4" y="46" width={r1(x(max) - 4 + 12)} height="46" rx="4" fill="#fff4cf" stroke={INK} strokeWidth="1.5" />
      {Array.from({ length: max * 10 + 1 }, (_, mm) => {
        const whole = mm % 10 === 0;
        const half = mm % 5 === 0;
        if (!whole && !half && !showMm) return null;
        const len = whole ? 18 : half ? 12 : 7;
        return <line key={mm} x1={x(mm / 10)} y1="46" x2={x(mm / 10)} y2={46 + len} stroke={INK} strokeWidth={whole ? 1.6 : 0.8} />;
      })}
      {Array.from({ length: max + 1 }, (_, cm) => (
        <text key={cm} x={x(cm)} y="80" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>
          {cm}
        </text>
      ))}
      <text x={x(max) + 16} y="80" fontSize="10" fill={MUTED} textAnchor="start">
        cm
      </text>
    </svg>
  );
}

/** An angle with its vertex at the bottom centre; optional protractor with two scales. */
export function AngleView({ degrees, start = 0, protractor, label }: Extract<Visual, { type: "angle" }>) {
  const cx = 180;
  const cy = 182;
  const R = 158;
  const ray = protractor ? 176 : 150;
  // Math angles (counterclockwise from the right); the screen's y grows downwards.
  const at = (deg: number, r: number) => ({ x: r1(cx + r * Math.cos(rad(deg))), y: r1(cy - r * Math.sin(rad(deg))) });
  const a = at(start, ray);
  const b = at(start + degrees, ray);
  const m1 = at(start, 30);
  const m2 = at(start + degrees, 30);
  const labelAt = at(start + degrees / 2, 50);
  return (
    <svg viewBox="0 0 360 200" className="w-full max-w-md" role="img" aria-label={protractor ? "각도기를 댄 각" : "각"}>
      {protractor && (
        <g>
          <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill={FILL} fillOpacity="0.2" stroke={INK} strokeWidth="1.5" />
          {Array.from({ length: 181 }, (_, d) => {
            const len = d % 10 === 0 ? 12 : d % 5 === 0 ? 8 : 4;
            const p = at(d, R);
            const q = at(d, R - len);
            return <line key={d} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={INK} strokeWidth={d % 10 === 0 ? 1.2 : 0.6} />;
          })}
          {Array.from({ length: 19 }, (_, k) => {
            const d = k * 10;
            // The end numbers sit just above the baseline, not on it.
            const lift = d === 0 || d === 180 ? 8 : 0;
            const outer = { ...at(d, R - 20), y: at(d, R - 20).y - lift };
            const inner = { ...at(d, R - 38), y: at(d, R - 38).y - lift };
            return (
              <g key={d}>
                <text x={outer.x} y={outer.y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill={INK}>
                  {180 - d}
                </text>
                <text x={inner.x} y={inner.y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill={ACCENT} fontWeight="700">
                  {d}
                </text>
              </g>
            );
          })}
          <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={INK} strokeWidth="1" />
        </g>
      )}
      <line x1={cx} y1={cy} x2={a.x} y2={a.y} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={b.x} y2={b.y} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d={`M ${m1.x} ${m1.y} A 30 30 0 ${degrees > 180 ? 1 : 0} 0 ${m2.x} ${m2.y}`} fill="none" stroke={ACCENT} strokeWidth="2" />
      <circle cx={cx} cy={cy} r="3.5" fill={INK} />
      {label && (
        <text x={labelAt.x} y={labelAt.y} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill={INK}>
          {label}
        </text>
      )}
    </svg>
  );
}
