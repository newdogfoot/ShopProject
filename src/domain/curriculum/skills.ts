/**
 * Concept map for MVP: 2022 revised curriculum, mathematics "수와 연산" (numbers and
 * operations), grades 1–6.
 *
 * - `prerequisites` are true learning dependencies. Diagnosis infers mastery only
 *   along these edges, so do not add an edge just because of textbook order.
 * - `grade`/`semester` are typical textbook placements (grades 3–6 use several
 *   publishers, so unit order can differ slightly).
 * - `standardArea` names the grade band and domain of the achievement standard;
 *   the exact standard numbers must still be checked against the official text.
 */
import type { Skill, Strand, StrandId } from "./types";

export const STRANDS: Strand[] = [
  { id: "NUM", name: "수", emoji: "🔢" },
  { id: "ADDSUB", name: "덧셈과 뺄셈", emoji: "➕" },
  { id: "MUL", name: "곱셈", emoji: "✖️" },
  { id: "DIV", name: "나눗셈", emoji: "➗" },
  { id: "MIXED", name: "혼합 계산·약수와 배수", emoji: "🧮" },
  { id: "FRAC", name: "분수", emoji: "🍕" },
  { id: "DEC", name: "소수", emoji: "📏" },
];

const S12 = "[2수01-…]";
const S34 = "[4수01-…]";
const S56 = "[6수01-…]";

export const SKILLS = [
  // ── 수 ───────────────────────────────────────────────
  {
    id: "NUM_UPTO9",
    strand: "NUM",
    name: "9까지의 수",
    goal: "9까지의 수를 세고, 읽고, 크기를 비교해요.",
    grade: 1, semester: 1, standardArea: S12,
    prerequisites: [],
    misconceptions: [],
    slowMs: 20_000, wordProblems: false,
  },
  {
    id: "NUM_UPTO50",
    strand: "NUM",
    name: "50까지의 수",
    goal: "10개씩 묶음과 낱개로 50까지의 수를 나타내요.",
    grade: 1, semester: 1, standardArea: S12,
    prerequisites: ["NUM_UPTO9"],
    misconceptions: ["PLACE_VALUE_SWAP"],
    slowMs: 30_000, wordProblems: false,
  },
  {
    id: "NUM_UPTO100",
    strand: "NUM",
    name: "100까지의 수",
    goal: "몇십 몇을 알고 100까지의 수의 크기를 비교해요.",
    grade: 1, semester: 2, standardArea: S12,
    prerequisites: ["NUM_UPTO50"],
    misconceptions: ["PLACE_VALUE_SWAP", "ADD_PLACE_MISALIGN"],
    slowMs: 30_000, wordProblems: false,
  },
  {
    id: "NUM_3DIGIT",
    strand: "NUM",
    name: "세 자리 수",
    goal: "백, 십, 일의 자리를 알고 세 자리 수를 읽고 써요.",
    grade: 2, semester: 1, standardArea: S12,
    prerequisites: ["NUM_UPTO100"],
    misconceptions: ["PLACE_VALUE_ZERO_OMIT", "PLACE_VALUE_WRITE_AS_HEARD", "PLACE_VALUE_DIGIT_ONLY"],
    slowMs: 40_000, wordProblems: false,
  },
  {
    id: "NUM_4DIGIT",
    strand: "NUM",
    name: "네 자리 수",
    goal: "천의 자리까지 자릿값을 알고 네 자리 수를 읽고 써요.",
    grade: 2, semester: 2, standardArea: S12,
    prerequisites: ["NUM_3DIGIT"],
    misconceptions: ["PLACE_VALUE_ZERO_OMIT", "PLACE_VALUE_WRITE_AS_HEARD", "PLACE_VALUE_DIGIT_ONLY"],
    slowMs: 45_000, wordProblems: false,
  },
  {
    id: "NUM_LARGE",
    strand: "NUM",
    name: "큰 수 (만, 억, 조)",
    goal: "만, 억, 조 단위의 큰 수를 읽고 쓰고, 자릿값을 알아요.",
    grade: 4, semester: 1, standardArea: S34,
    prerequisites: ["NUM_4DIGIT"],
    misconceptions: ["PLACE_VALUE_WRITE_AS_HEARD", "PLACE_VALUE_DIGIT_ONLY"],
    slowMs: 60_000, wordProblems: false,
  },

  // ── 덧셈과 뺄셈 ──────────────────────────────────────
  {
    id: "AS_1D_BASIC",
    strand: "ADDSUB",
    name: "한 자리 수의 덧셈과 뺄셈",
    goal: "합이 9까지인 덧셈과 그 뺄셈을 해요.",
    grade: 1, semester: 1, standardArea: S12,
    prerequisites: ["NUM_UPTO9"],
    misconceptions: [],
    slowMs: 20_000, wordProblems: true,
  },
  {
    id: "AS_MAKE10",
    strand: "ADDSUB",
    name: "10 모으기와 가르기",
    goal: "모아서 10이 되는 두 수를 찾고, 10을 두 수로 갈라요.",
    grade: 1, semester: 2, standardArea: S12,
    prerequisites: ["AS_1D_BASIC"],
    misconceptions: [],
    slowMs: 20_000, wordProblems: false,
  },
  {
    id: "AS_1D_CARRY_ADD",
    strand: "ADDSUB",
    name: "받아올림이 있는 (몇)+(몇)",
    goal: "10을 만들어서 합이 10보다 큰 덧셈을 해요.",
    grade: 1, semester: 2, standardArea: S12,
    prerequisites: ["AS_MAKE10"],
    misconceptions: ["ADD_NO_CARRY"],
    slowMs: 25_000, wordProblems: true,
  },
  {
    id: "AS_1D_BORROW_SUB",
    strand: "ADDSUB",
    name: "받아내림이 있는 (십몇)−(몇)",
    goal: "10에서 빼는 방법으로 십몇에서 몇을 빼요.",
    grade: 1, semester: 2, standardArea: S12,
    prerequisites: ["AS_MAKE10"],
    misconceptions: ["SUB_SMALLER_FROM_LARGER"],
    slowMs: 25_000, wordProblems: true,
  },
  {
    id: "AS_2D_NOCARRY",
    strand: "ADDSUB",
    name: "두 자리 수의 덧셈과 뺄셈 (받아올림 없음)",
    goal: "같은 자리끼리 더하고 빼요.",
    grade: 1, semester: 2, standardArea: S12,
    prerequisites: ["AS_1D_BASIC", "NUM_UPTO100"],
    misconceptions: ["ADD_PLACE_MISALIGN"],
    slowMs: 30_000, wordProblems: true,
  },
  {
    id: "AS_2D_CARRY_ADD",
    strand: "ADDSUB",
    name: "받아올림이 있는 두 자리 수의 덧셈",
    goal: "일의 자리 합이 10이 넘으면 십의 자리로 받아올려요.",
    grade: 2, semester: 1, standardArea: S12,
    prerequisites: ["AS_2D_NOCARRY", "AS_1D_CARRY_ADD"],
    misconceptions: ["ADD_NO_CARRY", "ADD_CARRY_WRITE_ALL"],
    slowMs: 40_000, wordProblems: true,
  },
  {
    id: "AS_2D_BORROW_SUB",
    strand: "ADDSUB",
    name: "받아내림이 있는 두 자리 수의 뺄셈",
    goal: "일의 자리끼리 뺄 수 없으면 십의 자리에서 10을 받아내려요.",
    grade: 2, semester: 1, standardArea: S12,
    prerequisites: ["AS_2D_NOCARRY", "AS_1D_BORROW_SUB"],
    misconceptions: ["SUB_SMALLER_FROM_LARGER", "SUB_BORROW_NO_DECREMENT"],
    slowMs: 40_000, wordProblems: true,
  },
  {
    id: "AS_3D_ADD",
    strand: "ADDSUB",
    name: "세 자리 수의 덧셈",
    goal: "받아올림을 주의하며 세 자리 수끼리 더해요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["AS_2D_CARRY_ADD", "NUM_3DIGIT"],
    misconceptions: ["ADD_NO_CARRY", "ADD_CARRY_WRITE_ALL"],
    slowMs: 50_000, wordProblems: true,
  },
  {
    id: "AS_3D_SUB",
    strand: "ADDSUB",
    name: "세 자리 수의 뺄셈",
    goal: "받아내림을 주의하며 세 자리 수끼리 빼요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["AS_2D_BORROW_SUB", "NUM_3DIGIT"],
    misconceptions: ["SUB_SMALLER_FROM_LARGER", "SUB_BORROW_NO_DECREMENT"],
    slowMs: 60_000, wordProblems: true,
  },

  // ── 곱셈 ─────────────────────────────────────────────
  {
    id: "MUL_MEANING",
    strand: "MUL",
    name: "곱셈의 뜻 (묶어 세기, 몇의 몇 배)",
    goal: "같은 수를 여러 번 더하는 것을 곱셈으로 나타내요.",
    grade: 2, semester: 1, standardArea: S12,
    prerequisites: ["AS_1D_CARRY_ADD", "NUM_UPTO50"],
    misconceptions: ["MUL_ADDED_INSTEAD"],
    slowMs: 30_000, wordProblems: true,
  },
  {
    id: "MUL_FACTS",
    strand: "MUL",
    name: "곱셈구구",
    goal: "2단부터 9단까지 곱셈구구를 정확하고 빠르게 해요.",
    grade: 2, semester: 2, standardArea: S12,
    prerequisites: ["MUL_MEANING"],
    misconceptions: ["MUL_ADDED_INSTEAD"],
    slowMs: 15_000, wordProblems: true,
  },
  {
    id: "MUL_NBY1",
    strand: "MUL",
    name: "(두·세 자리 수)×(한 자리 수)",
    goal: "자리별로 곱하고 올림을 더해요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["MUL_FACTS", "AS_2D_CARRY_ADD"],
    misconceptions: ["MUL_NO_CARRY", "MUL_CARRY_WRONG_ORDER"],
    slowMs: 50_000, wordProblems: true,
  },
  {
    id: "MUL_NBY2",
    strand: "MUL",
    name: "(두·세 자리 수)×(두 자리 수)",
    goal: "일의 자리 곱과 십의 자리 곱을 자리에 맞춰 더해요.",
    grade: 3, semester: 2, standardArea: S34,
    prerequisites: ["MUL_NBY1", "AS_3D_ADD"],
    misconceptions: ["MUL_PARTIAL_NO_SHIFT", "MUL_ONLY_SAME_PLACE"],
    slowMs: 90_000, wordProblems: true,
  },

  // ── 나눗셈 ───────────────────────────────────────────
  {
    id: "DIV_MEANING",
    strand: "DIV",
    name: "나눗셈의 뜻 (똑같이 나누기)",
    goal: "똑같이 나누는 상황을 나눗셈식으로 나타내요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["MUL_MEANING"],
    misconceptions: ["DIV_OP_CONFUSION"],
    slowMs: 30_000, wordProblems: true,
  },
  {
    id: "DIV_FACTS",
    strand: "DIV",
    name: "곱셈구구로 나눗셈의 몫 구하기",
    goal: "곱셈과 나눗셈의 관계를 이용해 몫을 구해요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["DIV_MEANING", "MUL_FACTS"],
    misconceptions: ["DIV_OP_CONFUSION"],
    slowMs: 20_000, wordProblems: true,
  },
  {
    id: "DIV_NBY1",
    strand: "DIV",
    name: "(두·세 자리 수)÷(한 자리 수)",
    goal: "높은 자리부터 나누고, 몫과 나머지를 구해요.",
    grade: 3, semester: 2, standardArea: S34,
    prerequisites: ["DIV_FACTS", "AS_2D_BORROW_SUB"],
    misconceptions: ["DIV_REMAINDER_TOO_BIG", "DIV_ZERO_IN_QUOTIENT_OMITTED"],
    slowMs: 70_000, wordProblems: true,
  },
  {
    id: "DIV_NBY2",
    strand: "DIV",
    name: "(두·세 자리 수)÷(두 자리 수)",
    goal: "몫을 어림해서 두 자리 수로 나누어요.",
    grade: 4, semester: 1, standardArea: S34,
    prerequisites: ["DIV_NBY1", "MUL_NBY2"],
    misconceptions: ["DIV_REMAINDER_TOO_BIG"],
    slowMs: 100_000, wordProblems: true,
  },

  // ── 혼합 계산·약수와 배수 ────────────────────────────
  {
    id: "MIX_ORDER",
    strand: "MIXED",
    name: "자연수의 혼합 계산",
    goal: "괄호 안, 곱셈·나눗셈, 덧셈·뺄셈 순서로 계산해요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["MUL_NBY1", "DIV_NBY1"],
    misconceptions: ["MIX_LEFT_TO_RIGHT", "MIX_IGNORE_PARENS"],
    slowMs: 90_000, wordProblems: false,
  },
  {
    id: "FACTOR_MULTIPLE",
    strand: "MIXED",
    name: "약수와 배수",
    goal: "어떤 수를 나누어떨어지게 하는 수(약수)와 몇 배 한 수(배수)를 구해요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["DIV_NBY1"],
    misconceptions: ["FACTOR_MULTIPLE_CONFUSE", "FACTOR_MISSING_TRIVIAL"],
    slowMs: 60_000, wordProblems: false,
  },
  {
    id: "GCD_LCM",
    strand: "MIXED",
    name: "최대공약수와 최소공배수",
    goal: "두 수의 공약수 중 가장 큰 수, 공배수 중 가장 작은 수를 구해요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["FACTOR_MULTIPLE"],
    misconceptions: ["GCD_LCM_CONFUSE", "LCM_AS_PRODUCT"],
    slowMs: 60_000, wordProblems: true,
  },

  // ── 분수 ─────────────────────────────────────────────
  {
    id: "FRAC_MEANING",
    strand: "FRAC",
    name: "분수의 뜻",
    goal: "전체를 똑같이 나눈 것 중의 몇을 분수로 나타내요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["DIV_MEANING"],
    misconceptions: ["FRAC_PART_PART", "FRAC_INVERTED"],
    slowMs: 30_000, wordProblems: false,
  },
  {
    id: "FRAC_COMPARE",
    strand: "FRAC",
    name: "분수의 크기 비교",
    goal: "단위분수, 분모가 같은 분수의 크기를 비교해요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["FRAC_MEANING"],
    misconceptions: ["FRAC_BIGGER_DEN_BIGGER"],
    slowMs: 25_000, wordProblems: false,
  },
  {
    id: "FRAC_OF_QUANTITY",
    strand: "FRAC",
    name: "전체의 분수만큼 구하기",
    goal: "12의 3/4처럼 전체의 분수만큼이 얼마인지 구해요.",
    grade: 3, semester: 2, standardArea: S34,
    prerequisites: ["FRAC_MEANING", "DIV_FACTS"],
    misconceptions: ["FRAC_OF_UNIT_ONLY"],
    slowMs: 45_000, wordProblems: true,
  },
  {
    id: "FRAC_MIXED_IMPROPER",
    strand: "FRAC",
    name: "진분수, 가분수, 대분수",
    goal: "가분수와 대분수를 서로 바꾸고 크기를 비교해요.",
    grade: 3, semester: 2, standardArea: S34,
    prerequisites: ["FRAC_COMPARE", "MUL_FACTS"],
    misconceptions: ["MIXED_TO_IMPROPER_ADD"],
    slowMs: 45_000, wordProblems: false,
  },
  {
    id: "FRAC_SAME_DEN_ADD",
    strand: "FRAC",
    name: "분모가 같은 분수의 덧셈",
    goal: "분모는 그대로 두고 분자끼리 더해요.",
    grade: 4, semester: 2, standardArea: S34,
    prerequisites: ["FRAC_MIXED_IMPROPER"],
    misconceptions: ["FRAC_ADD_DENOMINATORS"],
    slowMs: 50_000, wordProblems: true,
  },
  {
    id: "FRAC_SAME_DEN_SUB",
    strand: "FRAC",
    name: "분모가 같은 분수의 뺄셈",
    goal: "분자끼리 빼고, 모자라면 자연수에서 1을 받아내려요.",
    grade: 4, semester: 2, standardArea: S34,
    prerequisites: ["FRAC_MIXED_IMPROPER"],
    misconceptions: ["FRAC_SUB_SMALLER_FROM_LARGER"],
    slowMs: 60_000, wordProblems: true,
  },
  {
    id: "FRAC_EQUIV",
    strand: "FRAC",
    name: "약분과 통분",
    goal: "크기가 같은 분수를 만들고, 기약분수로 나타내고, 분모를 같게 해요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["GCD_LCM", "FRAC_MIXED_IMPROPER"],
    misconceptions: ["FRAC_EQUIV_ADD_SAME"],
    slowMs: 60_000, wordProblems: false,
  },
  {
    id: "FRAC_DIFF_DEN_ADD",
    strand: "FRAC",
    name: "분모가 다른 분수의 덧셈",
    goal: "통분한 다음 분자끼리 더해요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["FRAC_EQUIV", "FRAC_SAME_DEN_ADD"],
    misconceptions: ["FRAC_ADD_DENOMINATORS"],
    slowMs: 90_000, wordProblems: true,
  },
  {
    id: "FRAC_DIFF_DEN_SUB",
    strand: "FRAC",
    name: "분모가 다른 분수의 뺄셈",
    goal: "통분한 다음 분자끼리 빼요.",
    grade: 5, semester: 1, standardArea: S56,
    prerequisites: ["FRAC_EQUIV", "FRAC_SAME_DEN_SUB"],
    misconceptions: ["FRAC_SUB_DENOMINATORS"],
    slowMs: 100_000, wordProblems: true,
  },
  {
    id: "FRAC_MUL",
    strand: "FRAC",
    name: "분수의 곱셈",
    goal: "분자끼리, 분모끼리 곱하고 약분해요.",
    grade: 5, semester: 2, standardArea: S56,
    prerequisites: ["FRAC_EQUIV", "FRAC_OF_QUANTITY"],
    misconceptions: ["FRAC_MUL_WHOLE_TO_BOTH", "FRAC_MUL_MIXED_PARTS"],
    slowMs: 80_000, wordProblems: true,
  },
  {
    id: "FRAC_DIV_NAT",
    strand: "FRAC",
    name: "(분수)÷(자연수)",
    goal: "나눗셈의 몫을 분수로 나타내고, 분수를 자연수로 나누어요.",
    grade: 6, semester: 1, standardArea: S56,
    prerequisites: ["FRAC_MUL"],
    misconceptions: ["FRAC_DIV_INVERTED", "FRAC_DIV_MULTIPLIED"],
    slowMs: 70_000, wordProblems: true,
  },
  {
    id: "FRAC_DIV_FRAC",
    strand: "FRAC",
    name: "(분수)÷(분수)",
    goal: "나누는 분수의 분모와 분자를 바꾸어 곱해요.",
    grade: 6, semester: 2, standardArea: S56,
    prerequisites: ["FRAC_DIV_NAT"],
    misconceptions: ["FRAC_DIV_NO_INVERT", "FRAC_DIV_INVERT_WRONG"],
    slowMs: 90_000, wordProblems: true,
  },

  // ── 소수 ─────────────────────────────────────────────
  {
    id: "DEC_TENTHS",
    strand: "DEC",
    name: "소수 한 자리 수",
    goal: "0.1이 몇 개인지로 소수를 이해하고, 분수와 연결해요.",
    grade: 3, semester: 1, standardArea: S34,
    prerequisites: ["FRAC_MEANING"],
    misconceptions: ["DEC_PLACE_VALUE"],
    slowMs: 30_000, wordProblems: false,
  },
  {
    id: "DEC_HUNDREDTHS",
    strand: "DEC",
    name: "소수 두·세 자리 수와 크기 비교",
    goal: "소수의 자릿값을 알고 크기를 비교해요.",
    grade: 4, semester: 2, standardArea: S34,
    prerequisites: ["DEC_TENTHS"],
    misconceptions: ["DEC_LONGER_IS_BIGGER", "DEC_PLACE_VALUE"],
    slowMs: 40_000, wordProblems: false,
  },
  {
    id: "DEC_ADD",
    strand: "DEC",
    name: "소수의 덧셈",
    goal: "소수점끼리 맞추어 같은 자리끼리 더해요.",
    grade: 4, semester: 2, standardArea: S34,
    prerequisites: ["DEC_HUNDREDTHS", "AS_3D_ADD"],
    misconceptions: ["DEC_ALIGN_RIGHT", "ADD_NO_CARRY"],
    slowMs: 50_000, wordProblems: true,
  },
  {
    id: "DEC_SUB",
    strand: "DEC",
    name: "소수의 뺄셈",
    goal: "소수점끼리 맞추어 같은 자리끼리 빼요.",
    grade: 4, semester: 2, standardArea: S34,
    prerequisites: ["DEC_HUNDREDTHS", "AS_3D_SUB"],
    misconceptions: ["DEC_ALIGN_RIGHT", "SUB_SMALLER_FROM_LARGER"],
    slowMs: 60_000, wordProblems: true,
  },
  {
    id: "DEC_MUL",
    strand: "DEC",
    name: "소수의 곱셈",
    goal: "자연수처럼 곱한 뒤, 소수점 아래 자리 수를 더한 만큼 소수점을 찍어요.",
    grade: 5, semester: 2, standardArea: S56,
    prerequisites: ["DEC_HUNDREDTHS", "MUL_NBY2"],
    misconceptions: ["DEC_MUL_POINT"],
    slowMs: 70_000, wordProblems: true,
  },
  {
    id: "DEC_DIV_NAT",
    strand: "DEC",
    name: "(소수)÷(자연수)",
    goal: "자연수의 나눗셈처럼 나누고, 몫의 소수점은 나누어지는 수의 소수점 위치에 맞춰요.",
    grade: 6, semester: 1, standardArea: S56,
    prerequisites: ["DEC_HUNDREDTHS", "DIV_NBY1"],
    misconceptions: ["DEC_DIV_IGNORE_POINT"],
    slowMs: 70_000, wordProblems: true,
  },
  {
    id: "DEC_DIV_DEC",
    strand: "DEC",
    name: "(소수)÷(소수)",
    goal: "나누는 수가 자연수가 되도록 두 수의 소수점을 똑같이 옮겨서 나누어요.",
    grade: 6, semester: 2, standardArea: S56,
    prerequisites: ["DEC_DIV_NAT", "DEC_MUL"],
    misconceptions: ["DEC_DIV_POINT"],
    slowMs: 90_000, wordProblems: true,
  },
] as const satisfies readonly Skill[];

export type SkillId = (typeof SKILLS)[number]["id"];

export const SKILL_IDS: SkillId[] = SKILLS.map((s) => s.id);

const SKILL_MAP = new Map<string, Skill>(SKILLS.map((s) => [s.id, s as Skill]));

export function getSkill(id: string): Skill {
  const skill = SKILL_MAP.get(id);
  if (!skill) throw new Error(`unknown skill: ${id}`);
  return skill;
}

export function isSkillId(id: string): id is SkillId {
  return SKILL_MAP.has(id);
}

export function getStrand(id: StrandId): Strand {
  const strand = STRANDS.find((s) => s.id === id);
  if (!strand) throw new Error(`unknown strand: ${id}`);
  return strand;
}

export function skillsInStrand(id: StrandId): Skill[] {
  return (SKILLS as readonly Skill[]).filter((s) => s.strand === id);
}
