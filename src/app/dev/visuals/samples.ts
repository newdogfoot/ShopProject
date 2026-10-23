/** One example of every picture, for checking how they look (development and E2E only). */
import type { Item, Visual } from "@/domain/items/types";
import { intAns, UNITS, unitsAns } from "@/domain/items/helpers";
import { polygonFigure } from "@/domain/visual/figure";

const demoItem = (id: string, rest: Pick<Item, "prompt" | "answer" | "visual" | "check">): Item => ({
  id,
  skillId: "DEMO",
  difficulty: 1,
  seed: 1,
  format: "computation",
  bugs: [],
  steps: [],
  guessRate: 0.03,
  showVisual: rest.visual !== undefined,
  ...rest,
});

/** Problems with unit answers, to try the answer boxes. */
export const DEMO_ITEMS: Item[] = [
  demoItem("demo-time", {
    prompt: "1시간 50분 + 25분 = □",
    answer: unitsAns(UNITS.hourMin, 135),
    check: { k: "add", a: { k: "num", v: 110 }, b: { k: "num", v: 25 } },
  }),
  demoItem("demo-ruler", {
    prompt: "막대의 길이는 몇 cm일까요?",
    answer: intAns(5, "cm"),
    visual: { type: "ruler", max: 10, from: 2, to: 7 },
    check: { k: "sub", a: { k: "num", v: 7 }, b: { k: "num", v: 2 } },
  }),
];

export const SAMPLE_VISUALS: Array<{ name: string; visual: Visual }> = [
  { name: "시계 (3시 25분)", visual: { type: "clock", hour: 3, minute: 25 } },
  { name: "시계 (12시 50분)", visual: { type: "clock", hour: 12, minute: 50 } },
  { name: "자와 막대 (2 cm~7.4 cm)", visual: { type: "ruler", max: 10, from: 2, to: 7.4 } },
  { name: "각 (50°, 각도기)", visual: { type: "angle", degrees: 50, protractor: true } },
  { name: "각 (둔각)", visual: { type: "angle", degrees: 125, start: 15, label: "?" } },
  {
    name: "직사각형 (변의 길이, 직각)",
    visual: { type: "figure", shapes: polygonFigure([[0, 0], [6, 0], [6, 4], [0, 4]], { sides: ["6 cm", "4 cm", null, null], rightAngles: [0, 1, 2, 3] }) },
  },
  {
    name: "삼각형 (각의 크기, 이름)",
    visual: { type: "figure", shapes: polygonFigure([[0, 0], [7, 0], [2.5, 4]], { angles: ["55°", "40°", "?"], names: ["ㄱ", "ㄴ", "ㄷ"], marks: [0, 1, 2] }) },
  },
  {
    name: "평행사변형 (높이)",
    visual: {
      type: "figure",
      shapes: [
        ...polygonFigure([[0, 0], [7, 0], [9, 4], [2, 4]], { sides: ["7 cm", "5 cm", null, null] }),
        { s: "segment", from: [2, 4], to: [2, 0], dashed: true },
        { s: "right-angle", at: [2, 0], a: [3, 0], b: [2, 1] },
        { s: "label", at: [2, 2], text: "4 cm", dx: 22, dy: 0 },
      ],
    },
  },
  {
    name: "모눈종이 위 도형",
    visual: { type: "figure", grid: true, shapes: polygonFigure([[0, 0], [5, 0], [5, 2], [2, 2], [2, 4], [0, 4]], { fill: "brand" }) },
  },
  {
    name: "원 (반지름)",
    visual: {
      type: "figure",
      shapes: [
        { s: "circle", center: [0, 0], r: 3 },
        { s: "segment", from: [0, 0], to: [3, 0] },
        { s: "dot", at: [0, 0] },
        { s: "label", at: [1.5, 0], text: "5 cm", dx: 0, dy: -12 },
        { s: "label", at: [0, 0], text: "ㅇ", dx: -10, dy: 10 },
      ],
    },
  },
  {
    name: "선분·반직선·직선",
    visual: {
      type: "figure",
      shapes: [
        { s: "segment", from: [0, 4], to: [5, 4] },
        { s: "dot", at: [0, 4] },
        { s: "dot", at: [5, 4] },
        { s: "segment", from: [0, 2], to: [5, 2], arrows: "end" },
        { s: "dot", at: [0, 2] },
        { s: "segment", from: [0, 0], to: [5, 0], arrows: "both" },
      ],
    },
  },
  { name: "직육면체", visual: { type: "solid", shape: "cuboid", size: [5, 3, 3], labels: { width: "5 cm", height: "3 cm", depth: "3 cm" } } },
  { name: "정육면체", visual: { type: "solid", shape: "cuboid", size: [3, 3, 3] } },
  { name: "삼각기둥", visual: { type: "solid", shape: "prism", sides: 3 } },
  { name: "오각기둥", visual: { type: "solid", shape: "prism", sides: 5 } },
  { name: "사각뿔", visual: { type: "solid", shape: "pyramid", sides: 4 } },
  { name: "육각뿔", visual: { type: "solid", shape: "pyramid", sides: 6 } },
  { name: "원기둥", visual: { type: "solid", shape: "cylinder", labels: { height: "10 cm" } } },
  { name: "원뿔", visual: { type: "solid", shape: "cone" } },
  { name: "구", visual: { type: "solid", shape: "sphere" } },
  { name: "쌓기나무", visual: { type: "cubes", heights: [[2, 1, 1], [3, 1, 0], [1, 0, 0]] } },
  { name: "위에서 본 모양", visual: { type: "cube-plan", heights: [[2, 1, 1], [3, 1, 0], [1, 0, 0]] } },
  {
    name: "막대그래프 (한 칸 2명)",
    visual: { type: "bar-chart", title: "좋아하는 과일", categories: ["사과", "포도", "귤", "배"], values: [8, 12, 6, 4], step: 2, max: 14, unit: "명" },
  },
  {
    name: "꺾은선그래프 (물결선)",
    visual: { type: "line-chart", title: "강낭콩 키", labels: ["1일", "2일", "3일", "4일", "5일"], values: [12, 14, 15, 18, 19], min: 10, max: 20, step: 1, unit: "cm" },
  },
  {
    name: "그림그래프",
    visual: {
      type: "pictograph",
      title: "마을별 사과 생산량",
      icon: "🍎",
      big: 100,
      small: 10,
      unit: "상자",
      rows: [
        { label: "가 마을", value: 230 },
        { label: "나 마을", value: 150 },
        { label: "다 마을", value: 310 },
      ],
    },
  },
  {
    name: "표",
    visual: { type: "table", title: "좋아하는 운동", header: ["운동", "축구", "야구", "수영", "합계"], rows: [["학생 수(명)", "7", "5", "8", "20"]] },
  },
  {
    name: "띠그래프",
    visual: { type: "ratio-graph", style: "band", title: "좋아하는 계절", items: [{ label: "봄", percent: 35 }, { label: "여름", percent: 25 }, { label: "가을", percent: 30 }, { label: "겨울", percent: 10 }] },
  },
  {
    name: "원그래프",
    visual: { type: "ratio-graph", style: "pie", title: "하루 생활", items: [{ label: "잠", percent: 40 }, { label: "학교", percent: 30 }, { label: "놀이", percent: 20 }, { label: "기타", percent: 10 }] },
  },
  {
    name: "반복 무늬",
    visual: {
      type: "shapes",
      items: [
        { shape: "circle", color: "red" },
        { shape: "triangle", color: "blue" },
        { shape: "triangle", color: "blue" },
        { shape: "circle", color: "red" },
        { shape: "triangle", color: "blue" },
        { shape: "triangle", color: "blue" },
        null,
      ],
    },
  },
  {
    name: "분류할 도형",
    visual: {
      type: "shapes",
      items: [
        { shape: "square", color: "yellow", text: "1" },
        { shape: "star", color: "purple", size: "small" },
        { shape: "heart", color: "red" },
        { shape: "pentagon", color: "green" },
        { shape: "hexagon", color: "orange" },
        { shape: "rectangle", color: "blue" },
      ],
    },
  },
  {
    name: "물건 그림",
    visual: { type: "objects", items: [{ emoji: "📦", label: "상자" }, { emoji: "🥫", label: "통조림" }, { emoji: "⚽", label: "공" }, { emoji: "🎁" }] },
  },
];
