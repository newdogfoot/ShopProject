/** Coloured shapes (sorting, repeating patterns) and everyday things as emoji. */
import type { ShapeColor, ShapeToken, Visual } from "@/domain/items/types";
import { INK, MUTED } from "./palette";

const COLOR: Record<ShapeColor, string> = {
  red: "#ff6b6b",
  blue: "#4d96ff",
  yellow: "#ffd43b",
  green: "#51cf66",
  purple: "#9775fa",
  orange: "#ff922b",
};

const COLOR_NAME: Record<ShapeColor, string> = { red: "빨간색", blue: "파란색", yellow: "노란색", green: "초록색", purple: "보라색", orange: "주황색" };
const SHAPE_NAME: Record<ShapeToken["shape"], string> = {
  circle: "동그라미",
  triangle: "세모",
  square: "네모",
  rectangle: "긴 네모",
  star: "별",
  heart: "하트",
  pentagon: "오각형",
  hexagon: "육각형",
};

function polygonPoints(n: number, r: number, cx: number, cy: number, rotate = -90): string {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rotate + (360 * i) / n) * Math.PI) / 180;
    return `${Math.round((cx + r * Math.cos(a)) * 10) / 10},${Math.round((cy + r * Math.sin(a)) * 10) / 10}`;
  }).join(" ");
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + 36 * i) * Math.PI) / 180;
    return `${Math.round((cx + r * Math.cos(a)) * 10) / 10},${Math.round((cy + r * Math.sin(a)) * 10) / 10}`;
  }).join(" ");
}

function ShapeIcon({ token, crowded }: { token: ShapeToken; crowded: boolean }) {
  const full = crowded ? 34 : 44;
  const size = token.size === "small" ? Math.round(full * 0.68) : full;
  const fill = COLOR[token.color];
  const common = { fill, stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
  const body = (() => {
    switch (token.shape) {
      case "circle":
        return <circle cx="24" cy="24" r="19" {...common} />;
      case "triangle":
        return <polygon points="24,4 44,42 4,42" {...common} />;
      case "square":
        return <rect x="6" y="6" width="36" height="36" {...common} />;
      case "rectangle":
        return <rect x="2" y="12" width="44" height="24" {...common} />;
      case "star":
        return <polygon points={starPoints(24, 25, 21, 9)} {...common} />;
      case "heart":
        return <path d="M24 42 C 6 30, 2 18, 12 10 C 18 6, 23 10, 24 14 C 25 10, 30 6, 36 10 C 46 18, 42 30, 24 42 Z" {...common} />;
      case "pentagon":
        return <polygon points={polygonPoints(5, 20, 24, 26)} {...common} />;
      case "hexagon":
        return <polygon points={polygonPoints(6, 20, 24, 24, 0)} {...common} />;
    }
  })();
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      {body}
      {token.text && (
        <text x="24" y="26" textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="800" fill={INK}>
          {token.text}
        </text>
      )}
    </svg>
  );
}

export function tokenName(t: ShapeToken): string {
  return `${t.size === "small" ? "작은 " : t.size === "big" ? "큰 " : ""}${COLOR_NAME[t.color]} ${SHAPE_NAME[t.shape]}${t.text ? ` ${t.text}` : ""}`;
}

export function Shapes({ items }: Extract<Visual, { type: "shapes" }>) {
  // Long rows (patterns) use smaller shapes so the row stays on one line on a phone.
  const crowded = items.length > 6;
  return (
    <div className={`flex max-w-md flex-wrap items-center justify-center ${crowded ? "gap-1" : "gap-2"}`} role="img" aria-label={items.map((t) => (t ? tokenName(t) : "물음표")).join(", ")}>
      {items.map((t, i) =>
        t ? (
          <ShapeIcon key={i} token={t} crowded={crowded} />
        ) : (
          <span
            key={i}
            className={`flex items-center justify-center rounded-xl border-2 border-dashed font-black ${crowded ? "h-[34px] w-[34px] text-xl" : "h-11 w-11 text-2xl"}`}
            style={{ borderColor: MUTED, color: MUTED }}
          >
            ?
          </span>
        ),
      )}
    </div>
  );
}

export function Objects({ items }: Extract<Visual, { type: "objects" }>) {
  return (
    <ul className="flex max-w-md flex-wrap justify-center gap-2" aria-label={`그림: ${items.map((t) => t.label ?? t.emoji).join(", ")}`}>
      {items.map((t, i) => (
        <li key={i} className="flex min-w-12 flex-col items-center rounded-xl bg-white px-2 py-1 ring-1 ring-brand/15">
          <span className="text-3xl leading-tight" aria-hidden>
            {t.emoji}
          </span>
          {t.label && <span className="text-xs text-muted">{t.label}</span>}
        </li>
      ))}
    </ul>
  );
}
