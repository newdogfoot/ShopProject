/**
 * Line drawings of solids (겨냥도). Polyhedra use an oblique view from the front,
 * right and above; each edge is hidden (dashed) unless a face that faces the
 * viewer touches it. Round solids use the textbook look: an ellipse for each
 * circle, its back half dashed.
 */
import type { Point, SolidKind } from "../items/types";

export interface SolidDrawing {
  lines: Array<{ from: Point; to: Point; hidden: boolean }>;
  curves: Array<{ points: Point[]; hidden: boolean }>;
  /** Faces turned towards the viewer (for a light fill under the lines). */
  faces: Point[][];
  /** Text beside an edge; offsets are screen pixels. */
  labels: Array<{ at: Point; text: string; dx: number; dy: number }>;
}

type V3 = [number, number, number];

/** Depth is drawn going up and to the right, at half length. */
const DEPTH = 0.5;
const SLANT = (40 * Math.PI) / 180;
const VIEWER: V3 = [DEPTH * Math.cos(SLANT), DEPTH * Math.sin(SLANT), -1];

export function project([x, y, z]: V3): Point {
  return [x + DEPTH * z * Math.cos(SLANT), y + DEPTH * z * Math.sin(SLANT)];
}

function average(points: V3[]): V3 {
  const s = points.reduce<V3>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return [s[0] / points.length, s[1] / points.length, s[2] / points.length];
}

/** Outward normal of a face (Newell's method, flipped to point away from the solid's centre). */
function outwardNormal(face: number[], v: V3[], center: V3): V3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < face.length; i++) {
    const [x1, y1, z1] = v[face[i]];
    const [x2, y2, z2] = v[face[(i + 1) % face.length]];
    nx += (y1 - y2) * (z1 + z2);
    ny += (z1 - z2) * (x1 + x2);
    nz += (x1 - x2) * (y1 + y2);
  }
  const fc = average(face.map((i) => v[i]));
  const outward = (fc[0] - center[0]) * nx + (fc[1] - center[1]) * ny + (fc[2] - center[2]) * nz;
  return outward >= 0 ? [nx, ny, nz] : [-nx, -ny, -nz];
}

function polyhedron(vertices: V3[], faces: number[][]): SolidDrawing {
  const center = average(vertices);
  const facing = faces.map((f) => {
    const n = outwardNormal(f, vertices, center);
    return n[0] * VIEWER[0] + n[1] * VIEWER[1] + n[2] * VIEWER[2] > 1e-9;
  });
  const edges = new Map<string, { a: number; b: number; visible: boolean }>();
  faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const e = edges.get(key) ?? { a, b, visible: false };
      e.visible = e.visible || facing[fi];
      edges.set(key, e);
    }
  });
  return {
    lines: [...edges.values()].map((e) => ({ from: project(vertices[e.a]), to: project(vertices[e.b]), hidden: !e.visible })),
    curves: [],
    faces: faces.filter((_, i) => facing[i]).map((f) => f.map((i) => project(vertices[i]))),
    labels: [],
  };
}

/** Corners of a regular polygon of radius r on the floor, with one side facing the viewer. */
function basePolygon(sides: number, r: number, y: number): V3[] {
  const start = -Math.PI / 2 - Math.PI / sides;
  return Array.from({ length: sides }, (_, i) => {
    const t = start + (2 * Math.PI * i) / sides;
    return [r * Math.cos(t), y, r * Math.sin(t)] as V3;
  });
}

const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function cuboid(w: number, h: number, d: number, labels: { width?: string; height?: string; depth?: string }): SolidDrawing {
  const v: V3[] = [
    [0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0],
    [0, 0, d], [w, 0, d], [w, h, d], [0, h, d],
  ];
  const faces = [
    [0, 1, 2, 3], // front
    [4, 5, 6, 7], // back
    [0, 3, 7, 4], // left
    [1, 2, 6, 5], // right
    [0, 1, 5, 4], // bottom
    [3, 2, 6, 7], // top
  ];
  const drawing = polyhedron(v, faces);
  const p = v.map(project);
  if (labels.width) drawing.labels.push({ at: mid(p[0], p[1]), text: labels.width, dx: 0, dy: 14 });
  if (labels.height) drawing.labels.push({ at: mid(p[0], p[3]), text: labels.height, dx: -8, dy: 0 });
  if (labels.depth) drawing.labels.push({ at: mid(p[1], p[5]), text: labels.depth, dx: 10, dy: 6 });
  return drawing;
}

/** Points of an ellipse arc (x radius rx, y radius ry) around (cx, cy), t in radians. */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 24): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Point;
  });
}

const FLAT = 0.3;

function cylinder(r: number, h: number, labels: { width?: string; height?: string }): SolidDrawing {
  const ry = r * FLAT;
  return {
    lines: [
      { from: [-r, 0], to: [-r, h], hidden: false },
      { from: [r, 0], to: [r, h], hidden: false },
    ],
    curves: [
      { points: arc(0, h, r, ry, 0, 2 * Math.PI, 48), hidden: false },
      { points: arc(0, 0, r, ry, Math.PI, 2 * Math.PI), hidden: false },
      { points: arc(0, 0, r, ry, 0, Math.PI), hidden: true },
    ],
    faces: [],
    labels: [
      ...(labels.height ? [{ at: [-r, h / 2] as Point, text: labels.height, dx: -8, dy: 0 }] : []),
      ...(labels.width ? [{ at: [0, -ry] as Point, text: labels.width, dx: 0, dy: 14 }] : []),
    ],
  };
}

function cone(r: number, h: number, labels: { width?: string; height?: string }): SolidDrawing {
  const ry = r * FLAT;
  // Tangent points from the apex (0, h) to the base ellipse.
  const ty = (ry * ry) / h;
  const tx = r * Math.sqrt(Math.max(0, 1 - (ty * ty) / (ry * ry)));
  const tAngle = Math.asin(Math.min(1, ty / ry));
  return {
    lines: [
      { from: [-tx, ty], to: [0, h], hidden: false },
      { from: [tx, ty], to: [0, h], hidden: false },
    ],
    curves: [
      { points: arc(0, 0, r, ry, Math.PI - tAngle, 2 * Math.PI + tAngle), hidden: false },
      { points: arc(0, 0, r, ry, tAngle, Math.PI - tAngle), hidden: true },
    ],
    faces: [],
    labels: [
      ...(labels.height ? [{ at: [r * 0.5, h / 2] as Point, text: labels.height, dx: 8, dy: 0 }] : []),
      ...(labels.width ? [{ at: [0, -ry] as Point, text: labels.width, dx: 0, dy: 14 }] : []),
    ],
  };
}

function sphere(r: number, labels: { width?: string }): SolidDrawing {
  const ry = r * FLAT;
  return {
    lines: [],
    curves: [
      { points: arc(0, 0, r, r, 0, 2 * Math.PI, 64), hidden: false },
      { points: arc(0, 0, r, ry, Math.PI, 2 * Math.PI), hidden: false },
      { points: arc(0, 0, r, ry, 0, Math.PI), hidden: true },
    ],
    faces: [],
    labels: labels.width ? [{ at: [0, -r], text: labels.width, dx: 0, dy: 14 }] : [],
  };
}

export function solidDrawing(v: { shape: SolidKind; sides?: number; size?: [number, number, number]; labels?: { width?: string; height?: string; depth?: string } }): SolidDrawing {
  const labels = v.labels ?? {};
  const sides = Math.max(3, Math.min(8, v.sides ?? 4));
  switch (v.shape) {
    case "cuboid": {
      const [w, h, d] = v.size ?? [4, 3, 3];
      return cuboid(w, h, d, labels);
    }
    case "prism": {
      const bottom = basePolygon(sides, 2, 0);
      const top = basePolygon(sides, 2, 3.2);
      const faces = [
        bottom.map((_, i) => i),
        top.map((_, i) => sides + i),
        ...bottom.map((_, i) => [i, (i + 1) % sides, sides + ((i + 1) % sides), sides + i]),
      ];
      return polyhedron([...bottom, ...top], faces);
    }
    case "pyramid": {
      const base = basePolygon(sides, 2, 0);
      const apex: V3 = [0, 3.4, 0];
      const faces = [base.map((_, i) => i), ...base.map((_, i) => [i, (i + 1) % sides, sides])];
      return polyhedron([...base, apex], faces);
    }
    case "cylinder":
      return cylinder(2, 3.2, labels);
    case "cone":
      return cone(2, 3.4, labels);
    case "sphere":
      return sphere(2, labels);
  }
}

export interface CubeFace {
  kind: "top" | "front" | "right";
  points: Point[];
}

/**
 * Faces of stacked unit cubes in drawing order (back to front, bottom to top,
 * left to right), leaving out faces covered by a neighbouring cube.
 * heights[row][col]; row 0 is the back row.
 */
export function cubeFaces(heights: number[][]): CubeFace[] {
  const rows = heights.length;
  const has = (x: number, y: number, z: number) => {
    const r = rows - 1 - z;
    if (r < 0 || r >= rows || x < 0 || y < 0) return false;
    return y < (heights[r][x] ?? 0);
  };
  const faces: CubeFace[] = [];
  for (let z = rows - 1; z >= 0; z--) {
    const row = heights[rows - 1 - z];
    const top = Math.max(0, ...row);
    for (let y = 0; y < top; y++) {
      for (let x = 0; x < row.length; x++) {
        if (!has(x, y, z)) continue;
        const P = (a: number, b: number, c: number) => project([a, b, c]);
        if (!has(x, y, z - 1)) faces.push({ kind: "front", points: [P(x, y, z), P(x + 1, y, z), P(x + 1, y + 1, z), P(x, y + 1, z)] });
        if (!has(x, y + 1, z)) faces.push({ kind: "top", points: [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)] });
        if (!has(x + 1, y, z)) faces.push({ kind: "right", points: [P(x + 1, y, z), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z)] });
      }
    }
  }
  return faces;
}

export function countCubes(heights: number[][]): number {
  return heights.flat().reduce((s, h) => s + Math.max(0, h), 0);
}
