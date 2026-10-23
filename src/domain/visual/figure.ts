/**
 * Builds flat figures (polygons with side lengths, angles, right-angle marks and
 * corner names) as figure pieces. Label positions are worked out here so the
 * drawing code only has to scale and draw.
 */
import type { FigureShape, Point } from "../items/types";

export interface PolygonOptions {
  /** Text beside side i (from point i to point i + 1), e.g. "5 cm". */
  sides?: Array<string | null | undefined>;
  /** Text inside corner i, e.g. "60°" or "?". */
  angles?: Array<string | null | undefined>;
  /** Corners marked with a right-angle square. */
  rightAngles?: number[];
  /** Corners marked with an angle arc. */
  marks?: number[];
  /** Corner names written outside (ㄱ, ㄴ, ㄷ, ㄹ). */
  names?: string[];
  fill?: "soft" | "brand" | "none";
}

/** Label font size and the space kept between a label and the lines (screen pixels). */
export const LABEL_SIZE = 14;
const CLEARANCE = 5;
const NAME_GAP = 13;

/** Rough width of a label in pixels (Hangul is wider than digits and Latin letters). */
export function estimateTextWidth(text: string, fontSize = LABEL_SIZE): number {
  let em = 0;
  for (const ch of text) {
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) em += 1;
    else if (ch === " ") em += 0.3;
    else if (/[°.,:]/.test(ch)) em += 0.35;
    else if (/[a-z]/.test(ch)) em += 0.56;
    else em += 0.64;
  }
  return Math.ceil(em * fontSize);
}

/** How far to move a label's centre along `direction` so its box clears a line through the anchor. */
function boxGap(text: string, direction: Point): number {
  const w = estimateTextWidth(text) / 2;
  const h = LABEL_SIZE / 2 + 1;
  return CLEARANCE + Math.abs(direction[0]) * w + Math.abs(direction[1]) * h;
}

/** Positive when the points go counterclockwise (x right, y up). */
export function signedArea(points: Point[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function unitVector(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Screen offset (y grows downwards) of `px` pixels in a figure direction (y grows upwards). */
export function screenOffset(direction: Point, px: number): { dx: number; dy: number } {
  return { dx: round(direction[0] * px), dy: round(-direction[1] * px) };
}

/** Interior angle at corner i, in radians. */
function cornerAngle(points: Point[], i: number, ccw: boolean): number {
  const n = points.length;
  const p = points[i];
  const next = points[(i + 1) % n];
  const prev = points[(i - 1 + n) % n];
  const a1 = Math.atan2(next[1] - p[1], next[0] - p[0]);
  const a2 = Math.atan2(prev[1] - p[1], prev[0] - p[0]);
  let d = ccw ? a2 - a1 : a1 - a2;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  return d;
}

/** Direction from a corner into the polygon, halfway between its two sides. */
function insideDirection(points: Point[], i: number, ccw: boolean): Point {
  const n = points.length;
  const p = points[i];
  const next = points[(i + 1) % n];
  const prev = points[(i - 1 + n) % n];
  const u1 = unitVector(next[0] - p[0], next[1] - p[1]);
  const u2 = unitVector(prev[0] - p[0], prev[1] - p[1]);
  const sum: Point = [u1[0] + u2[0], u1[1] + u2[1]];
  if (Math.hypot(sum[0], sum[1]) < 1e-9) return ccw ? [-u1[1], u1[0]] : [u1[1], -u1[0]];
  const bisector = unitVector(sum[0], sum[1]);
  // A reflex corner (more than 180°): the bisector points outside.
  const cross = u1[0] * u2[1] - u1[1] * u2[0];
  const convex = ccw ? cross > 0 : cross < 0;
  return convex ? bisector : [-bisector[0], -bisector[1]];
}

export function polygonFigure(points: Point[], opts: PolygonOptions = {}): FigureShape[] {
  const n = points.length;
  const ccw = signedArea(points) > 0;
  const shapes: FigureShape[] = [{ s: "polygon", points, fill: opts.fill ?? "soft" }];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const next = points[(i + 1) % n];
    const prev = points[(i - 1 + n) % n];
    const inside = insideDirection(points, i, ccw);
    if (opts.rightAngles?.includes(i)) shapes.push({ s: "right-angle", at: p, a: next, b: prev });
    // Angle arcs go counterclockwise from the first direction to the second.
    if (opts.marks?.includes(i)) shapes.push({ s: "angle-mark", at: p, a: ccw ? next : prev, b: ccw ? prev : next });
    const angle = opts.angles?.[i];
    if (angle) {
      // Narrow corners push the label further in so it does not touch either side.
      const half = Math.max(0.15, Math.sin(cornerAngle(points, i, ccw) / 2));
      const r = Math.max(estimateTextWidth(angle), LABEL_SIZE) / 2 + CLEARANCE;
      const distance = Math.min(72, Math.max(26, r / half));
      shapes.push({ s: "label", at: p, text: angle, ...screenOffset(inside, distance) });
    }
    const name = opts.names?.[i];
    if (name) shapes.push({ s: "label", at: p, text: name, bold: true, ...screenOffset([-inside[0], -inside[1]], NAME_GAP) });
    const side = opts.sides?.[i];
    if (side) {
      const [vx, vy] = [next[0] - p[0], next[1] - p[1]];
      const outward = ccw ? unitVector(vy, -vx) : unitVector(-vy, vx);
      shapes.push({ s: "label", at: [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2], text: side, ...screenOffset(outward, boxGap(side, outward)) });
    }
  }
  return shapes;
}

/** Every point a figure uses (for fitting it into the picture). */
export function figurePoints(shapes: FigureShape[]): Point[] {
  const out: Point[] = [];
  for (const sh of shapes) {
    switch (sh.s) {
      case "polygon":
        out.push(...sh.points);
        break;
      case "segment":
        out.push(sh.from, sh.to);
        break;
      case "circle":
        out.push([sh.center[0] - sh.r, sh.center[1] - sh.r], [sh.center[0] + sh.r, sh.center[1] + sh.r]);
        break;
      case "angle-mark":
      case "right-angle":
      case "dot":
      case "label":
        out.push(sh.at);
        break;
    }
  }
  return out;
}
