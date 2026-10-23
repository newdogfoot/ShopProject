import { describe, expect, it } from "vitest";
import { figurePoints, polygonFigure, signedArea } from "./figure";
import { countCubes, cubeFaces, project, solidDrawing } from "./solid";
import { clockHands, describeClock } from "./clock";

describe("flat figures", () => {
  it("puts side labels outside and angle labels inside, whichever way the points go", () => {
    const square: Array<[number, number]> = [[0, 0], [4, 0], [4, 4], [0, 4]];
    for (const pts of [square, [...square].reverse()]) {
      const shapes = polygonFigure(pts, { sides: ["a", "b", "c", "d"], angles: ["A", "B", "C", "D"], rightAngles: [0] });
      const labels = shapes.filter((s) => s.s === "label");
      const side = (t: string) => labels.find((l) => l.s === "label" && l.text === t)!;
      const bottom = pts === square ? side("a") : side("c");
      // The bottom side (y = 0) has its label below the figure: positive dy on screen.
      expect(bottom.s === "label" && bottom.dy! > 0).toBe(true);
      // Angle label at (0, 0) points into the square: right and up on screen.
      const corner = labels.find((l) => l.s === "label" && l.at[0] === 0 && l.at[1] === 0 && /^[A-D]$/.test(l.text))!;
      expect(corner.s === "label" && corner.dx! > 0 && corner.dy! < 0).toBe(true);
      expect(shapes.some((s) => s.s === "right-angle")).toBe(true);
    }
    expect(signedArea(square)).toBe(16);
    expect(figurePoints([{ s: "circle", center: [0, 0], r: 2 }])).toEqual([[-2, -2], [2, 2]]);
  });
});

describe("solids", () => {
  it("dashes the three hidden edges of a cuboid", () => {
    const d = solidDrawing({ shape: "cuboid", size: [4, 3, 2] });
    expect(d.lines).toHaveLength(12);
    expect(d.lines.filter((l) => l.hidden)).toHaveLength(3);
    expect(d.faces).toHaveLength(3);
  });

  it("draws prisms and pyramids with the right number of edges", () => {
    for (const sides of [3, 4, 5, 6]) {
      expect(solidDrawing({ shape: "prism", sides }).lines).toHaveLength(3 * sides);
      expect(solidDrawing({ shape: "pyramid", sides }).lines).toHaveLength(2 * sides);
      // The back of the solid is hidden, so some edges are dashed and some faces face the viewer.
      expect(solidDrawing({ shape: "prism", sides }).lines.some((l) => l.hidden)).toBe(true);
      expect(solidDrawing({ shape: "pyramid", sides }).faces.length).toBeGreaterThan(0);
    }
  });

  it("dashes the back half of a cylinder's base", () => {
    const d = solidDrawing({ shape: "cylinder" });
    expect(d.curves.filter((c) => c.hidden)).toHaveLength(1);
    expect(d.curves.find((c) => c.hidden)!.points.every((p) => p[1] >= -1e-9)).toBe(true);
  });

  it("stacks cubes back to front and hides covered faces", () => {
    expect(cubeFaces([[1]])).toHaveLength(3);
    // Two cubes side by side: the right face of the left one is covered.
    expect(cubeFaces([[1, 1]])).toHaveLength(5);
    // A cube on top of another: the lower top face is covered.
    expect(cubeFaces([[2]])).toHaveLength(5);
    const faces = cubeFaces([[2, 1], [1, 0]]);
    // The back row is drawn before the front row.
    const firstFront = faces.findIndex((f) => f.points[0][1] === project([0, 0, 0])[1] && f.kind === "front" && f.points[0][0] === 0);
    expect(firstFront).toBe(faces.length - 3);
    expect(countCubes([[2, 1], [1, 0]])).toBe(4);
  });
});

describe("clock", () => {
  it("moves the hour hand with the minutes and describes the hands", () => {
    expect(clockHands(3, 30)).toEqual({ hour: 105, minute: 180 });
    expect(clockHands(12, 0)).toEqual({ hour: 0, minute: 0 });
    expect(describeClock(3, 25)).toBe("짧은바늘은 3과 4 사이, 긴바늘은 5를 가리키는 시계");
    expect(describeClock(2, 7)).toBe("짧은바늘은 2와 3 사이, 긴바늘은 1에서 작은 눈금 2칸 더 간 곳을 가리키는 시계");
    expect(describeClock(12, 0)).toBe("짧은바늘은 12, 긴바늘은 12를 가리키는 시계");
  });
});
