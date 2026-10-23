/** Colours and the fit-to-box helper shared by the pictures. */
import type { Point } from "@/domain/items/types";

export const INK = "#4c3bd1";
export const FILL = "#b9a8ff";
export const SOFT = "#ece6ff";
export const ACCENT = "#ff8a3d";
export const MUTED = "#8a84b5";
export const GRID = "#ddd6fb";

export interface Fit {
  x: (v: number) => number;
  y: (v: number) => number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Maps figure units (y up) into an SVG box (y down) that is at most maxWidth ×
 * maxHeight pixels, keeping `pad` pixels around for labels.
 */
export function fitPoints(points: Point[], o: { maxWidth: number; maxHeight: number; pad: number; maxScale?: number; bounds?: [number, number, number, number] }): Fit {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, minY, maxX, maxY] = o.bounds ?? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const w = Math.max(maxX - minX, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((o.maxWidth - 2 * o.pad) / w, (o.maxHeight - 2 * o.pad) / h, o.maxScale ?? Infinity);
  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    x: (v) => r(o.pad + (v - minX) * scale),
    y: (v) => r(o.pad + (maxY - v) * scale),
    width: r(w * scale + 2 * o.pad),
    height: r(h * scale + 2 * o.pad),
    scale,
  };
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The SVG box grown to hold every label, as a viewBox and its pixel width. */
export function grownViewBox(fit: Fit, labels: Box[]): { viewBox: string; width: number } {
  const minX = Math.min(0, ...labels.map((b) => b.minX - 4));
  const minY = Math.min(0, ...labels.map((b) => b.minY - 4));
  const maxX = Math.max(fit.width, ...labels.map((b) => b.maxX + 4));
  const maxY = Math.max(fit.height, ...labels.map((b) => b.maxY + 4));
  const r = (v: number) => Math.round(v);
  return { viewBox: `${r(minX)} ${r(minY)} ${r(maxX - minX)} ${r(maxY - minY)}`, width: r(maxX - minX) };
}

/** Polyline/polygon "points" attribute. */
export function pointsAttr(points: Point[], fit: Fit): string {
  return points.map(([x, y]) => `${fit.x(x)},${fit.y(y)}`).join(" ");
}
