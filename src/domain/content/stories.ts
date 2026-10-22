/**
 * Template word problems. The numbers always come from the generated item, so
 * the answer computed by code stays valid; only the story around them changes.
 * AI can rewrite these stories later (see src/ai), but these always work.
 */
import { formatRational } from "../math/rational";
import { josa, withJosa } from "../math/korean";
import type { Rng } from "../math/rng";
import type { QuantityUnit, StorySpec } from "../items/types";

export type Theme = "animal" | "snack" | "space" | "sports" | "nature";

export const THEMES: Array<{ id: Theme; name: string; emoji: string }> = [
  { id: "animal", name: "동물", emoji: "🐿️" },
  { id: "snack", name: "간식", emoji: "🍪" },
  { id: "space", name: "우주", emoji: "🚀" },
  { id: "sports", name: "운동", emoji: "⚽" },
  { id: "nature", name: "자연", emoji: "🌳" },
];

export function isTheme(x: string): x is Theme {
  return THEMES.some((t) => t.id === x);
}

interface Countable {
  word: string;
  counter: string;
}

interface Vocab {
  names: string[];
  countables: Countable[];
  container: string;
  liquid: string;
  weight: string;
  length: string;
  mover: string;
}

const KID_NAMES = ["지우", "서아", "하루", "도아", "시우", "유나", "예서", "주아"];

const VOCAB: Record<Theme, Vocab> = {
  animal: {
    names: ["다람쥐", "토끼", "강아지", "고양이", "너구리"],
    countables: [
      { word: "도토리", counter: "개" },
      { word: "당근", counter: "개" },
      { word: "물고기", counter: "마리" },
      { word: "사과", counter: "개" },
    ],
    container: "바구니",
    liquid: "우유",
    weight: "사료",
    length: "끈",
    mover: "거북이",
  },
  snack: {
    names: KID_NAMES,
    countables: [
      { word: "사탕", counter: "개" },
      { word: "쿠키", counter: "개" },
      { word: "젤리", counter: "개" },
      { word: "귤", counter: "개" },
    ],
    container: "봉지",
    liquid: "주스",
    weight: "밀가루",
    length: "리본",
    mover: "장난감 기차",
  },
  space: {
    names: KID_NAMES,
    countables: [
      { word: "별 스티커", counter: "장" },
      { word: "로켓 블록", counter: "개" },
      { word: "행성 카드", counter: "장" },
    ],
    container: "상자",
    liquid: "물",
    weight: "모래",
    length: "전선",
    mover: "탐사 로봇",
  },
  sports: {
    names: KID_NAMES,
    countables: [
      { word: "공", counter: "개" },
      { word: "배지", counter: "개" },
      { word: "셔틀콕", counter: "개" },
    ],
    container: "가방",
    liquid: "물",
    weight: "모래주머니",
    length: "줄",
    mover: "자전거",
  },
  nature: {
    names: KID_NAMES,
    countables: [
      { word: "나뭇잎", counter: "장" },
      { word: "솔방울", counter: "개" },
      { word: "조개껍데기", counter: "개" },
      { word: "꽃", counter: "송이" },
    ],
    container: "바구니",
    liquid: "물",
    weight: "흙",
    length: "끈",
    mover: "달팽이",
  },
};

const j = withJosa;

function two<T>(rng: Rng, items: T[]): [T, T] {
  const a = rng.pick(items);
  let b = rng.pick(items);
  let guard = 0;
  while (b === a && guard++ < 10) b = rng.pick(items);
  return [a, b];
}

function qty(value: string, unit: QuantityUnit): string {
  return `${value}${unit}`;
}

/** Retells a computation as a short story in the chosen theme. */
export function renderStory(spec: StorySpec, theme: Theme, rng: Rng): string {
  const v = VOCAB[theme];
  const [name, name2] = two(rng, v.names);
  const item = rng.pick(v.countables);
  const c = item.counter;
  switch (spec.kind) {
    case "add":
      return rng.bool()
        ? `${j(name, "은/는")} ${j(item.word, "을/를")} ${spec.a}${c} 가지고 있었어요. ${name2}에게서 ${spec.b}${c}${josa(c, "을/를")} 더 받았어요. ${j(name, "이/가")} 가진 ${j(item.word, "은/는")} 모두 몇 ${c}일까요?`
        : `${v.container}에 ${j(item.word, "이/가")} ${spec.a}${c} 있어요. ${spec.b}${c}${josa(c, "을/를")} 더 넣으면 ${j(item.word, "은/는")} 모두 몇 ${c}가 될까요?`;
    case "sub-takeaway":
      return rng.bool()
        ? `${j(item.word, "이/가")} ${spec.a}${c} 있었어요. 그중에서 ${spec.b}${c}${josa(c, "을/를")} 친구에게 주었어요. 남은 ${j(item.word, "은/는")} 몇 ${c}일까요?`
        : `${j(name, "은/는")} ${item.word} ${spec.a}${c} 중에서 ${spec.b}${c}${josa(c, "을/를")} 동생에게 주었어요. 남은 ${j(item.word, "은/는")} 몇 ${c}일까요?`;
    case "sub-compare":
      return `${j(name, "은/는")} ${j(item.word, "을/를")} ${spec.a}${c}, ${j(name2, "은/는")} ${spec.b}${c} 모았어요. ${j(name, "이/가")} ${name2}보다 몇 ${c} 더 많이 모았을까요?`;
    case "mul-groups":
      return `한 ${v.container}에 ${j(item.word, "이/가")} ${spec.each}${c}씩 들어 있어요. ${spec.groups}${v.container}에 들어 있는 ${j(item.word, "은/는")} 모두 몇 ${c}일까요?`;
    case "div-share":
      return spec.withRemainder
        ? `${item.word} ${spec.total}${c}${josa(c, "을/를")} ${spec.parts}명이 똑같이 나누어 가지려고 해요. 한 명이 몇 ${c}씩 가질 수 있고, 몇 ${c}${josa(c, "이/가")} 남을까요?`
        : `${item.word} ${spec.total}${c}${josa(c, "을/를")} ${spec.parts}명이 똑같이 나누어 가지려고 해요. 한 명이 몇 ${c}씩 가질 수 있을까요?`;
    case "div-group":
      return spec.withRemainder
        ? `${item.word} ${spec.total}${c}${josa(c, "을/를")} 한 ${v.container}에 ${spec.size}${c}씩 담으려고 해요. 몇 ${v.container}에 담을 수 있고, 몇 ${c}${josa(c, "이/가")} 남을까요?`
        : `${item.word} ${spec.total}${c}${josa(c, "을/를")} 한 ${v.container}에 ${spec.size}${c}씩 담으려고 해요. 몇 ${v.container}에 담을 수 있을까요?`;
    case "frac-of": {
      const frac = formatRational(spec.frac, "fraction");
      return `${j(name, "은/는")} ${item.word} ${spec.total}${c} 중에서 ${frac}만큼을 가졌어요. ${j(name, "이/가")} 가진 ${j(item.word, "은/는")} 몇 ${c}일까요?`;
    }
    case "qty-add":
      if (spec.unit === "L") return `${j(name, "은/는")} ${j(v.liquid, "을/를")} 오전에 ${qty(spec.a, "L")}, 오후에 ${qty(spec.b, "L")} 마셨어요. ${j(name, "이/가")} 오늘 마신 ${j(v.liquid, "은/는")} 모두 몇 L일까요?`;
      if (spec.unit === "kg") return `${v.weight} ${j(qty(spec.a, "kg"), "과/와")} ${j(qty(spec.b, "kg"), "을/를")} 한 자루에 모았어요. 자루에 담긴 ${j(v.weight, "은/는")} 모두 몇 kg일까요?`;
      return `${j(v.length, "이/가")} 두 도막 있어요. 한 도막은 ${qty(spec.a, "m")}, 다른 도막은 ${qty(spec.b, "m")}예요. 두 도막의 길이를 합하면 모두 몇 m일까요?`;
    case "qty-sub":
      if (spec.unit === "L") return `${v.liquid} ${qty(spec.a, "L")} 중에서 ${j(qty(spec.b, "L"), "을/를")} 마셨어요. 남은 ${j(v.liquid, "은/는")} 몇 L일까요?`;
      if (spec.unit === "kg") return `${v.weight} ${qty(spec.a, "kg")} 중에서 ${j(qty(spec.b, "kg"), "을/를")} 사용했어요. 남은 ${j(v.weight, "은/는")} 몇 kg일까요?`;
      return `${v.length} ${qty(spec.a, "m")} 중에서 ${j(qty(spec.b, "m"), "을/를")} 잘라 썼어요. 남은 ${j(v.length, "은/는")} 몇 m일까요?`;
    case "qty-mul-rate":
      if (spec.unit === "L") return `1분에 물이 ${qty(spec.rate, "L")}씩 나오는 수도꼭지가 있어요. ${spec.times}분 동안 받은 물은 몇 L일까요?`;
      if (spec.unit === "kg") return `1m의 무게가 ${qty(spec.rate, "kg")}인 막대가 있어요. 이 막대 ${spec.times}m의 무게는 몇 kg일까요?`;
      return `${j(v.mover, "이/가")} 1분에 ${qty(spec.rate, "m")}씩 가요. 같은 빠르기로 ${spec.times}분 동안 가면 몇 m를 갈까요?`;
    case "qty-frac-of":
      if (spec.unit === "L") return `${v.liquid} ${qty(spec.total, "L")}의 ${spec.frac}만큼을 마셨어요. 마신 ${j(v.liquid, "은/는")} 몇 L일까요?`;
      if (spec.unit === "kg") return `${v.weight} ${qty(spec.total, "kg")}의 ${spec.frac}만큼을 사용했어요. 사용한 ${j(v.weight, "은/는")} 몇 kg일까요?`;
      return `${v.length} ${qty(spec.total, "m")}의 ${spec.frac}만큼을 잘랐어요. 자른 ${j(v.length, "은/는")} 몇 m일까요?`;
    case "qty-div-share":
      if (spec.unit === "L") return `${v.liquid} ${j(qty(spec.total, "L"), "을/를")} ${spec.parts}명이 똑같이 나누어 마시려고 해요. 한 명이 몇 L씩 마시면 될까요?`;
      if (spec.unit === "kg") return `${v.weight} ${j(qty(spec.total, "kg"), "을/를")} ${spec.parts}개의 그릇에 똑같이 나누어 담으려고 해요. 한 그릇에 몇 kg씩 담으면 될까요?`;
      return `${v.length} ${j(qty(spec.total, "m"), "을/를")} ${spec.parts}명이 똑같이 나누어 가지려고 해요. 한 명이 몇 m씩 가지면 될까요?`;
    case "qty-div-group":
      if (spec.unit === "L") return `${v.liquid} ${j(qty(spec.total, "L"), "을/를")} 한 병에 ${qty(spec.size, "L")}씩 나누어 담으려고 해요. 몇 병이 될까요?`;
      if (spec.unit === "kg") return `${v.weight} ${j(qty(spec.total, "kg"), "을/를")} 한 봉지에 ${qty(spec.size, "kg")}씩 담으려고 해요. 몇 봉지가 될까요?`;
      return `${v.length} ${j(qty(spec.total, "m"), "을/를")} ${qty(spec.size, "m")}씩 자르려고 해요. 몇 도막이 될까요?`;
    case "gcd": {
      const [x, y] = two(rng, v.countables);
      return `${x.word} ${spec.a}${x.counter}${josa(x.counter, "과/와")} ${y.word} ${spec.b}${y.counter}${josa(y.counter, "을/를")} 남김없이 최대한 많은 친구에게 똑같이 나누어 주려고 해요. 최대 몇 명에게 나누어 줄 수 있을까요?`;
    }
    case "lcm":
      return `${j(name, "은/는")} ${spec.a}일마다, ${j(name2, "은/는")} ${spec.b}일마다 도서관에 가요. 오늘 둘이 함께 도서관에 갔다면, 다음에 다시 함께 가는 날은 며칠 뒤일까요?`;
  }
}
