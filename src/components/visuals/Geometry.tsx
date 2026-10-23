/** Shapes: flat figures, solids, stacked cubes and their plan from above. */
import type { FigureShape, Point, Visual } from "@/domain/items/types";
import { estimateTextWidth, figurePoints, LABEL_SIZE, unitVector } from "@/domain/visual/figure";
import { countCubes, cubeFaces, solidDrawing } from "@/domain/visual/solid";
import { ACCENT, FILL, fitPoints, GRID, grownViewBox, INK, pointsAttr, SOFT, type Box, type Fit } from "./palette";

/** Text anchored away from the figure: labels pushed left end at their point, pushed right start there. */
function anchorFor(dx: number, dy: number): "start" | "middle" | "end" {
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 4) return "middle";
  return dx < 0 ? "end" : "start";
}

function labelBox(x: number, y: number, text: string, anchor: "start" | "middle" | "end"): Box {
  const w = estimateTextWidth(text);
  const minX = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
  return { minX, maxX: minX + w, minY: y - LABEL_SIZE / 2 - 2, maxY: y + LABEL_SIZE / 2 + 2 };
}

const FILL_COLOR = { soft: SOFT, brand: FILL, none: "none" } as const;

/** Small arrowhead at `tip`, pointing away from `from` (screen coordinates). */
function arrowHead(from: { x: number; y: number }, tip: { x: number; y: number }): string {
  const [ux, uy] = unitVector(tip.x - from.x, tip.y - from.y);
  const back = { x: tip.x - ux * 11, y: tip.y - uy * 11 };
  const side = { x: -uy * 5, y: ux * 5 };
  return `${tip.x},${tip.y} ${back.x + side.x},${back.y + side.y} ${back.x - side.x},${back.y - side.y}`;
}

function screen(fit: Fit, p: Point) {
  return { x: fit.x(p[0]), y: fit.y(p[1]) };
}

function FigurePiece({ shape, fit }: { shape: FigureShape; fit: Fit }) {
  switch (shape.s) {
    case "polygon":
      return (
        <polygon
          points={pointsAttr(shape.points, fit)}
          fill={FILL_COLOR[shape.fill ?? "soft"]}
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeDasharray={shape.dashed ? "6 5" : undefined}
        />
      );
    case "segment": {
      const a = screen(fit, shape.from);
      const b = screen(fit, shape.to);
      const color = shape.color === "accent" ? ACCENT : INK;
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={shape.dashed ? "6 5" : undefined} />
          {shape.arrows && <polygon points={arrowHead(a, b)} fill={color} />}
          {shape.arrows === "both" && <polygon points={arrowHead(b, a)} fill={color} />}
        </g>
      );
    }
    case "circle": {
      const c = screen(fit, shape.center);
      return (
        <circle cx={c.x} cy={c.y} r={Math.round(shape.r * fit.scale * 10) / 10} fill={FILL_COLOR[shape.fill ?? "soft"]} stroke={INK} strokeWidth="2.5" strokeDasharray={shape.dashed ? "6 5" : undefined} />
      );
    }
    case "right-angle": {
      const p = screen(fit, shape.at);
      const a = screen(fit, shape.a);
      const b = screen(fit, shape.b);
      const [ux, uy] = unitVector(a.x - p.x, a.y - p.y);
      const [vx, vy] = unitVector(b.x - p.x, b.y - p.y);
      const s = 12;
      return <polyline points={`${p.x + ux * s},${p.y + uy * s} ${p.x + (ux + vx) * s},${p.y + (uy + vy) * s} ${p.x + vx * s},${p.y + vy * s}`} fill="none" stroke={INK} strokeWidth="1.5" />;
    }
    case "angle-mark": {
      const p = screen(fit, shape.at);
      const a = screen(fit, shape.a);
      const b = screen(fit, shape.b);
      const [ux, uy] = unitVector(a.x - p.x, a.y - p.y);
      const [vx, vy] = unitVector(b.x - p.x, b.y - p.y);
      const r = 20;
      // Counterclockwise in the figure is counterclockwise on screen too (sweep 0), as y is flipped once.
      const cross = ux * vy - uy * vx;
      const large = cross > 0 ? 1 : 0;
      return <path d={`M ${p.x + ux * r} ${p.y + uy * r} A ${r} ${r} 0 ${large} 0 ${p.x + vx * r} ${p.y + vy * r}`} fill="none" stroke={ACCENT} strokeWidth="2" />;
    }
    case "dot": {
      const p = screen(fit, shape.at);
      return <circle cx={p.x} cy={p.y} r="4" fill={INK} />;
    }
    case "label": {
      const p = screen(fit, shape.at);
      return (
        <text x={p.x + (shape.dx ?? 0)} y={p.y + (shape.dy ?? 0)} textAnchor="middle" dominantBaseline="central" fontSize={LABEL_SIZE} fontWeight={shape.bold ? 800 : 700} fill={INK}>
          {shape.text}
        </text>
      );
    }
  }
}

const ORDER: Record<FigureShape["s"], number> = { polygon: 0, circle: 1, segment: 2, "right-angle": 3, "angle-mark": 3, dot: 4, label: 5 };

export function Figure({ shapes, grid }: Extract<Visual, { type: "figure" }>) {
  const pts = figurePoints(shapes);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bounds: [number, number, number, number] = grid
    ? [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))]
    : [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const fit = fitPoints(pts, { maxWidth: 320, maxHeight: 220, pad: 14, maxScale: 46, bounds });
  const sorted = shapes.map((shape, i) => ({ shape, i })).sort((a, b) => ORDER[a.shape.s] - ORDER[b.shape.s] || a.i - b.i);
  const labels = shapes.flatMap((s) => (s.s === "label" ? [s] : []));
  const box = grownViewBox(
    fit,
    labels.map((l) => labelBox(fit.x(l.at[0]) + (l.dx ?? 0), fit.y(l.at[1]) + (l.dy ?? 0), l.text, "middle")),
  );
  return (
    <svg viewBox={box.viewBox} width={box.width} className="h-auto max-w-full" role="img" aria-label={labels.length ? `도형 그림 (${labels.map((l) => l.text).join(", ")})` : "도형 그림"}>
      {grid &&
        Array.from({ length: bounds[2] - bounds[0] + 1 }, (_, i) => bounds[0] + i).map((gx) => (
          <line key={`x${gx}`} x1={fit.x(gx)} y1={fit.y(bounds[1])} x2={fit.x(gx)} y2={fit.y(bounds[3])} stroke={GRID} strokeWidth="1" />
        ))}
      {grid &&
        Array.from({ length: bounds[3] - bounds[1] + 1 }, (_, i) => bounds[1] + i).map((gy) => (
          <line key={`y${gy}`} x1={fit.x(bounds[0])} y1={fit.y(gy)} x2={fit.x(bounds[2])} y2={fit.y(gy)} stroke={GRID} strokeWidth="1" />
        ))}
      {sorted.map(({ shape, i }) => (
        <FigurePiece key={i} shape={shape} fit={fit} />
      ))}
    </svg>
  );
}

const SOLID_NAME = { cuboid: "직육면체", prism: "각기둥", pyramid: "각뿔", cylinder: "원기둥", cone: "원뿔", sphere: "구" } as const;

export function Solid(v: Extract<Visual, { type: "solid" }>) {
  const d = solidDrawing(v);
  const pts: Point[] = [...d.lines.flatMap((l) => [l.from, l.to]), ...d.curves.flatMap((c) => c.points), ...d.labels.map((l) => l.at)];
  const fit = fitPoints(pts, { maxWidth: 240, maxHeight: 210, pad: 12, maxScale: 44 });
  const name = v.shape === "cuboid" && v.size && v.size[0] === v.size[1] && v.size[1] === v.size[2] ? "정육면체" : SOLID_NAME[v.shape];
  const placed = d.labels.map((l) => {
    const x = fit.x(l.at[0]) + l.dx;
    const y = fit.y(l.at[1]) + l.dy;
    const anchor = anchorFor(l.dx, l.dy);
    return { ...l, x, y, anchor, box: labelBox(x, y, l.text, anchor) };
  });
  const box = grownViewBox(fit, placed.map((l) => l.box));
  return (
    <svg viewBox={box.viewBox} width={box.width} className="h-auto max-w-full" role="img" aria-label={`입체도형 그림 (${name})`}>
      {d.faces.map((f, i) => (
        <polygon key={`f${i}`} points={pointsAttr(f, fit)} fill={SOFT} />
      ))}
      {d.lines.map((l, i) => (
        <line
          key={`l${i}`}
          x1={fit.x(l.from[0])}
          y1={fit.y(l.from[1])}
          x2={fit.x(l.to[0])}
          y2={fit.y(l.to[1])}
          stroke={INK}
          strokeWidth={l.hidden ? 1.5 : 2.5}
          strokeDasharray={l.hidden ? "5 4" : undefined}
          strokeOpacity={l.hidden ? 0.7 : 1}
          strokeLinecap="round"
        />
      ))}
      {d.curves.map((c, i) => (
        <polyline key={`c${i}`} points={pointsAttr(c.points, fit)} fill="none" stroke={INK} strokeWidth={c.hidden ? 1.5 : 2.5} strokeDasharray={c.hidden ? "5 4" : undefined} strokeOpacity={c.hidden ? 0.7 : 1} />
      ))}
      {placed.map((l, i) => (
        <text key={`t${i}`} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="central" fontSize={LABEL_SIZE} fontWeight="700" fill={INK}>
          {l.text}
        </text>
      ))}
    </svg>
  );
}

const CUBE_FILL = { top: "#e4dbff", front: "#b9a8ff", right: "#9682ee" } as const;

export function Cubes({ heights }: Extract<Visual, { type: "cubes" }>) {
  const faces = cubeFaces(heights);
  const fit = fitPoints(faces.flatMap((f) => f.points), { maxWidth: 280, maxHeight: 230, pad: 10, maxScale: 38 });
  return (
    <svg viewBox={`0 0 ${fit.width} ${fit.height}`} width={fit.width} className="h-auto max-w-full" role="img" aria-label={`쌓기나무 ${countCubes(heights) > 0 ? "그림" : ""}`.trim()}>
      {faces.map((f, i) => (
        <polygon key={i} points={pointsAttr(f.points, fit)} fill={CUBE_FILL[f.kind]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function CubePlan({ heights, numbers = true }: Extract<Visual, { type: "cube-plan" }>) {
  const cell = 38;
  const cols = Math.max(...heights.map((r) => r.length));
  const width = cols * cell + 4;
  const height = heights.length * cell + 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} className="h-auto max-w-full" role="img" aria-label={numbers ? `위에서 본 모양: ${heights.map((r) => r.join(" ")).join(" / ")}` : "위에서 본 모양"}>
      {heights.flatMap((row, r) =>
        row.map((h, c) =>
          h > 0 ? (
            <g key={`${r}-${c}`}>
              <rect x={2 + c * cell} y={2 + r * cell} width={cell} height={cell} fill={SOFT} stroke={INK} strokeWidth="2" />
              {numbers && (
                <text x={2 + c * cell + cell / 2} y={2 + r * cell + cell / 2} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="800" fill={INK}>
                  {h}
                </text>
              )}
            </g>
          ) : null,
        ),
      )}
    </svg>
  );
}
