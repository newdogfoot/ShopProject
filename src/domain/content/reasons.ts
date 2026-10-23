/**
 * "Why" questions: after a child can compute, can they say why the method works?
 *
 * Each question works two ways:
 * - pick the right reason (grades 1–2, or when writing or AI is off). Wrong options
 *   are misconceptions in a child's words, so picking one reveals it;
 * - write the reason (grade 3+, AI grades it against the rubric).
 *
 * Numbers are fixed in the text so every child sees a reviewed sentence.
 */
import type { SkillId } from "../curriculum/skills";

export interface ReasonSpec {
  id: string;
  skillId: SkillId;
  /** The question (math markup). Must make sense both as pick-one and as write-your-own. */
  prompt: string;
  /** The right reason, in a child's words. */
  correct: string;
  /** Wrong reasons; one tied to a misconception reveals it when chosen. */
  distractors: Array<{ text: string; misconceptionId?: string }>;
  /** Key ideas a full written answer contains (1–3), for AI grading. */
  rubric: string[];
  /** A model explanation shown after answering. */
  model: string;
}

export const REASONS: ReasonSpec[] = [
  // ── 수 ──────────────────────────────────────────────
  {
    id: "NUM_UPTO50.tens-first",
    skillId: "NUM_UPTO50",
    prompt: "10개씩 묶음 3개와 낱개 4개를 34라고 쓰는 까닭은 무엇일까요?",
    correct: "10개씩 묶음의 수 3은 앞(십의 자리)에, 낱개의 수 4는 뒤(일의 자리)에 쓰기 때문이에요.",
    distractors: [
      { text: "낱개의 수를 앞에, 묶음의 수를 뒤에 쓰기 때문이에요.", misconceptionId: "PLACE_VALUE_SWAP" },
      { text: "3과 4를 더한 수라서 그렇게 쓰기 때문이에요." },
    ],
    rubric: ["10개씩 묶음의 수(3)를 앞(십의 자리)에 씀", "낱개의 수(4)를 뒤(일의 자리)에 씀"],
    model: "10개씩 묶음 3개는 30이고 낱개 4개는 4예요. 묶음의 수는 앞에, 낱개의 수는 뒤에 써서 34가 돼요.",
  },
  {
    id: "NUM_3DIGIT.zero-placeholder",
    skillId: "NUM_3DIGIT",
    prompt: "백 모형 3개와 일 모형 5개를 나타내는 수를 35가 아니라 305로 쓰는 까닭은 무엇일까요?",
    correct: "십 모형이 없어서 십의 자리에 0을 써야 3이 백의 자리에 있게 되기 때문이에요.",
    distractors: [
      { text: "0은 아무것도 없다는 뜻이라서 써도 되고 안 써도 되기 때문이에요.", misconceptionId: "PLACE_VALUE_ZERO_OMIT" },
      { text: "백 모형이 있으면 숫자를 세 개 써야 해서 아무 숫자나 넣으면 되기 때문이에요." },
    ],
    rubric: ["십의 자리가 비어 있음(십 모형이 없음)", "빈 자리에 0을 씀", "3이 백의 자리에 있어야 300을 나타냄"],
    model: "백 모형 3개는 300이에요. 십 모형이 없으니 십의 자리에 0을 써야 3이 백의 자리에 남아서 305가 돼요. 0을 빼면 35가 되어 버려요.",
  },
  {
    id: "NUM_4DIGIT.digit-value",
    skillId: "NUM_4DIGIT",
    prompt: "어떤 친구가 4527에서 숫자 5는 5를 나타낸다고 했어요. 친구의 생각이 맞을까요? 까닭과 함께 답해 보세요.",
    correct: "틀려요. 5는 백의 자리에 있어서 100이 5개인 500을 나타내요.",
    distractors: [
      { text: "맞아요. 숫자 5는 어느 자리에 있든 5를 나타내요.", misconceptionId: "PLACE_VALUE_DIGIT_ONLY" },
      { text: "틀려요. 5는 천의 자리에 있어서 5000을 나타내요." },
    ],
    rubric: ["친구의 생각이 틀렸다고 함", "5는 백의 자리에 있음", "500(100이 5개)을 나타냄"],
    model: "틀렸어요. 4527에서 5는 백의 자리 숫자라서 100이 5개, 즉 500을 나타내요. 숫자는 어느 자리에 있는지에 따라 나타내는 값이 달라요.",
  },
  {
    id: "NUM_LARGE.write-as-heard",
    skillId: "NUM_LARGE",
    prompt: "어떤 친구가 '오만 칠백'을 50000700이라고 썼어요. 친구의 생각이 맞을까요? 까닭과 함께 답해 보세요.",
    correct: "틀려요. 만의 자리에 5, 백의 자리에 7을 쓰고 나머지 자리는 0이라서 50700이에요.",
    distractors: [
      { text: "맞아요. 50000과 700을 들리는 대로 이어 쓰면 돼요.", misconceptionId: "PLACE_VALUE_WRITE_AS_HEARD" },
      { text: "틀려요. 빈 자리의 0은 쓰지 않으니까 57이에요.", misconceptionId: "PLACE_VALUE_ZERO_OMIT" },
    ],
    rubric: ["친구의 생각이 틀렸다고 함", "각 숫자를 자기 자리에 씀(만의 자리 5, 백의 자리 7)", "빈 자리는 0으로 채워 50700"],
    model: "틀렸어요. 오만 칠백은 만의 자리가 5, 백의 자리가 7이고 천·십·일의 자리는 0이라서 50700이에요. 50000과 700을 이어 쓰면 훨씬 큰 수가 돼요.",
  },

  // ── 덧셈과 뺄셈 ─────────────────────────────────────
  {
    id: "AS_MAKE10.make-ten",
    skillId: "AS_MAKE10",
    prompt: "8+5를 계산할 때 5를 2와 3으로 가르는 까닭은 무엇일까요?",
    correct: "8과 2를 모아 10을 만들면 10과 3을 더해 13으로 쉽게 구할 수 있기 때문이에요.",
    distractors: [
      { text: "5는 언제나 2와 3으로만 가를 수 있기 때문이에요." },
      { text: "2와 3을 빼야 답이 나오기 때문이에요." },
    ],
    rubric: ["8과 2를 모아 10을 만듦", "10과 남은 3을 더해 13"],
    model: "8은 2가 더 있으면 10이 돼요. 그래서 5를 2와 3으로 갈라 8+2=10을 만들고, 10+3=13으로 계산해요.",
  },
  {
    id: "AS_2D_CARRY_ADD.carry",
    skillId: "AS_2D_CARRY_ADD",
    prompt: "47+38에서 일의 자리 7+8=15일 때 5만 쓰고 1을 십의 자리로 받아올리는 까닭은 무엇일까요?",
    correct: "15는 10이 1개, 1이 5개라서 10 한 묶음을 십의 자리로 보내야 하기 때문이에요.",
    distractors: [
      { text: "15를 일의 자리에 그대로 써도 되기 때문이에요.", misconceptionId: "ADD_CARRY_WRITE_ALL" },
      { text: "1은 작은 수라서 버려도 되기 때문이에요.", misconceptionId: "ADD_NO_CARRY" },
    ],
    rubric: ["15는 10(한 묶음)과 5", "10을 십의 자리로 받아올림(십의 자리에 1을 더함)", "한 자리에는 숫자를 하나만 씀"],
    model: "7+8=15는 10과 5예요. 한 자리에는 숫자를 하나만 쓸 수 있어서 일의 자리에 5를 쓰고, 10은 십의 자리로 받아올려 십의 자리 계산에 1을 더해요.",
  },
  {
    id: "AS_2D_BORROW_SUB.borrow",
    skillId: "AS_2D_BORROW_SUB",
    prompt: "52−38에서 일의 자리 2에서 8을 뺄 수 없을 때 어떻게 계산해야 할까요? 까닭과 함께 답해 보세요.",
    correct: "십의 자리에서 10을 받아내려 12−8을 계산해요. 10을 내려 주었으니 십의 자리 5는 4가 돼요.",
    distractors: [
      { text: "거꾸로 8−2를 해서 6을 써요. 큰 수에서 작은 수를 빼면 되기 때문이에요.", misconceptionId: "SUB_SMALLER_FROM_LARGER" },
      { text: "10을 받아내려도 십의 자리 5는 그대로 두어요.", misconceptionId: "SUB_BORROW_NO_DECREMENT" },
    ],
    rubric: ["2에서 8을 뺄 수 없음", "십의 자리에서 10을 받아내려 12−8을 계산함", "십의 자리 수가 1 작아짐(5→4)"],
    model: "2에서 8을 뺄 수 없으니 십의 자리에서 10을 받아내려 12−8=4를 해요. 10을 내려 주었으니 십의 자리는 5가 아니라 4가 되고, 4−3=1이라서 답은 14예요.",
  },
  {
    id: "AS_3D_SUB.borrow-across-zero",
    skillId: "AS_3D_SUB",
    prompt: "403−158에서 일의 자리 3에서 8을 빼려는데 십의 자리가 0이에요. 어떻게 받아내려야 할까요?",
    correct: "백의 자리에서 십의 자리로 받아내려 10을 만들고, 다시 십의 자리에서 일의 자리로 받아내려요. 그러면 백 3, 십 9, 일 13이 돼요.",
    distractors: [
      { text: "0에서는 받아내릴 수 없으니 일의 자리는 거꾸로 8−3을 계산해요.", misconceptionId: "SUB_SMALLER_FROM_LARGER" },
      { text: "백의 자리에서 일의 자리로 바로 10을 받아내리고, 백의 자리 4는 그대로 두어요.", misconceptionId: "SUB_BORROW_NO_DECREMENT" },
    ],
    rubric: ["백의 자리에서 십의 자리로 받아내림(백의 자리 4→3)", "십의 자리에서 일의 자리로 받아내림(십의 자리 10→9)", "일의 자리는 13−8을 계산함"],
    model: "십의 자리가 0이라서 먼저 백의 자리에서 받아내려 십의 자리를 10으로 만들어요. 그다음 십의 자리에서 일의 자리로 받아내리면 백 3, 십 9, 일 13이 되고, 차례로 빼면 245예요.",
  },

  // ── 곱셈과 나눗셈 ─────────────────────────────────────
  {
    id: "MUL_MEANING.repeated-addition",
    skillId: "MUL_MEANING",
    prompt: "3씩 4묶음이 7이 아니라 12인 까닭은 무엇일까요?",
    correct: "3이 4번 있으니 3+3+3+3을 해야 해서 12이기 때문이에요.",
    distractors: [
      { text: "3과 4를 한 번 더하면 7이니까 7이 맞아요.", misconceptionId: "MUL_ADDED_INSTEAD" },
      { text: "4를 3번 빼면 되기 때문이에요." },
    ],
    rubric: ["3이 4번(4묶음) 있음", "3을 4번 더함(3+3+3+3)", "3×4=12"],
    model: "3씩 4묶음은 3이 4번 있다는 뜻이에요. 3+3+3+3=12라서 3×4=12예요. 3과 4를 한 번 더하는 것과 달라요.",
  },
  {
    id: "MUL_FACTS.build-from-known",
    skillId: "MUL_FACTS",
    prompt: "3×6=18을 알 때, 3×7을 어떻게 구할 수 있을까요? 까닭과 함께 답해 보세요.",
    correct: "3×7은 3씩 7묶음이라 3씩 6묶음보다 3이 한 묶음 더 있으니 18+3=21이에요.",
    distractors: [
      { text: "6이 7로 1 커졌으니 18+1=19예요." },
      { text: "3×6과 3×7은 아무 관계가 없어서 처음부터 다시 세어야 해요." },
    ],
    rubric: ["3×7은 3×6보다 3이 한 묶음 더 많음", "18+3=21"],
    model: "3×7은 3씩 7묶음이에요. 3씩 6묶음(18)에 3이 한 묶음 더 있으니 18+3=21이에요.",
  },
  {
    id: "MUL_NBY1.carry",
    skillId: "MUL_NBY1",
    prompt: "27×3을 계산할 때 일의 자리 7×3=21에서 1을 쓰고 2를 올림하는 까닭은 무엇일까요?",
    correct: "21은 20과 1이라서, 20을 십의 자리 곱 60에 더해야 하기 때문이에요.",
    distractors: [
      { text: "2는 버려도 되기 때문이에요.", misconceptionId: "MUL_NO_CARRY" },
      { text: "올림한 2를 먼저 십의 자리 2에 더한 다음 3을 곱해야 하기 때문이에요.", misconceptionId: "MUL_CARRY_WRONG_ORDER" },
    ],
    rubric: ["7×3=21은 20과 1", "20(올림한 2)을 십의 자리로 올림", "십의 자리 곱 20×3=60에 더해 81"],
    model: "7×3=21은 20과 1이에요. 일의 자리에 1을 쓰고 20은 십의 자리로 올려요. 십의 자리는 20×3=60이고 올린 20을 더해 81이 돼요.",
  },
  {
    id: "MUL_NBY2.shift",
    skillId: "MUL_NBY2",
    prompt: "23×14를 계산할 때 23×1의 결과를 한 칸 왼쪽으로 밀어 쓰는 까닭은 무엇일까요?",
    correct: "14의 1은 십의 자리 숫자라서 실제로는 23×10=230을 계산한 것이기 때문이에요.",
    distractors: [
      { text: "밀어 쓰지 않고 23을 그대로 써도 답이 같기 때문이에요.", misconceptionId: "MUL_PARTIAL_NO_SHIFT" },
      { text: "줄을 예쁘게 맞추려고 밀어 쓰는 것이에요." },
    ],
    rubric: ["14의 1은 10을 나타냄", "23×10=230", "그래서 한 칸 왼쪽(십의 자리)부터 씀"],
    model: "14는 10과 4예요. 23×4=92와 23×10=230을 더해야 해요. 230은 일의 자리가 0이라서 한 칸 왼쪽부터 쓰는 거예요. 그래서 92+230=322예요.",
  },
  {
    id: "DIV_MEANING.share",
    skillId: "DIV_MEANING",
    prompt: "12÷3=4가 무엇을 뜻하는지 설명해 볼까요?",
    correct: "12개를 3묶음으로 똑같이 나누면 한 묶음에 4개씩이라는 뜻이에요.",
    distractors: [
      { text: "12에서 3을 빼면 4가 남는다는 뜻이에요.", misconceptionId: "DIV_OP_CONFUSION" },
      { text: "12와 3을 곱하면 4가 된다는 뜻이에요." },
    ],
    rubric: ["똑같이 나눔", "3묶음(또는 3개씩)으로 나눔", "한 묶음에 4개(또는 4묶음)"],
    model: "12개를 3묶음으로 똑같이 나누면 한 묶음에 4개가 돼요. 3개씩 덜어 내면 4번 덜어 낼 수 있다는 뜻도 돼요.",
  },
  {
    id: "DIV_NBY1.remainder-smaller",
    skillId: "DIV_NBY1",
    prompt: "어떤 친구가 47÷5의 몫을 8, 나머지를 7이라고 했어요. 친구의 생각이 맞을까요? 까닭과 함께 답해 보세요.",
    correct: "틀려요. 나머지 7은 나누는 수 5보다 커서 한 번 더 나눌 수 있어요. 몫은 9, 나머지는 2예요.",
    distractors: [
      { text: "맞아요. 5×8+7=47이니까 나머지가 나누는 수보다 커도 괜찮아요.", misconceptionId: "DIV_REMAINDER_TOO_BIG" },
      { text: "틀려요. 나머지는 언제나 0이어야 해요." },
    ],
    rubric: ["친구의 생각이 틀렸다고 함", "나머지는 나누는 수(5)보다 작아야 함", "몫 9, 나머지 2"],
    model: "틀렸어요. 나머지 7에서 5를 한 번 더 덜어 낼 수 있으니 몫이 1 커져요. 47÷5는 몫 9, 나머지 2예요. 나머지는 나누는 수보다 항상 작아야 해요.",
  },

  // ── 혼합 계산·약수와 배수 ──────────────────────────────
  {
    id: "MIX_ORDER.mul-first",
    skillId: "MIX_ORDER",
    prompt: "2+3×4를 계산할 때 3×4를 먼저 계산하는 까닭은 무엇일까요?",
    correct: "곱셈은 덧셈보다 먼저 계산하기로 약속했기 때문이에요. 3×4=12에 2를 더해 14예요.",
    distractors: [
      { text: "식은 언제나 앞에서부터 차례로 계산하니까 사실은 2+3을 먼저 해야 해요.", misconceptionId: "MIX_LEFT_TO_RIGHT" },
      { text: "큰 수끼리 먼저 계산하기 때문이에요." },
    ],
    rubric: ["곱셈을 덧셈보다 먼저 계산하는 약속", "3×4=12를 먼저 구하고 2를 더해 14"],
    model: "곱셈과 나눗셈은 덧셈과 뺄셈보다 먼저 계산하기로 약속했어요. 그래서 3×4=12를 먼저 구하고 2를 더해 14가 돼요.",
  },
  {
    id: "FACTOR_MULTIPLE.trivial-factors",
    skillId: "FACTOR_MULTIPLE",
    prompt: "1과 12가 모두 12의 약수인 까닭은 무엇일까요?",
    correct: "12를 1로 나누어도, 12로 나누어도 나누어떨어지기 때문이에요.",
    distractors: [
      { text: "1은 너무 작고 12는 자기 자신이라서 사실은 약수가 아니에요.", misconceptionId: "FACTOR_MISSING_TRIVIAL" },
      { text: "1과 12는 12의 배수이기 때문이에요.", misconceptionId: "FACTOR_MULTIPLE_CONFUSE" },
    ],
    rubric: ["12÷1=12로 나누어떨어짐", "12÷12=1로 나누어떨어짐", "어떤 수를 나누어떨어지게 하는 수가 약수"],
    model: "약수는 그 수를 나누어떨어지게 하는 수예요. 12÷1=12, 12÷12=1로 모두 나누어떨어지니까 1과 12도 12의 약수예요.",
  },
  {
    id: "GCD_LCM.lcm-not-product",
    skillId: "GCD_LCM",
    prompt: "4와 6의 최소공배수가 24가 아니라 12인 까닭은 무엇일까요?",
    correct: "12는 4의 배수이면서 6의 배수이고, 4와 6의 공배수 중에서 가장 작은 수이기 때문이에요.",
    distractors: [
      { text: "최소공배수는 언제나 두 수를 곱한 값이니까 사실은 24가 맞아요.", misconceptionId: "LCM_AS_PRODUCT" },
      { text: "4와 6을 모두 나누어떨어지게 하는 가장 큰 수가 12이기 때문이에요.", misconceptionId: "GCD_LCM_CONFUSE" },
    ],
    rubric: ["12는 4와 6의 공배수(4×3, 6×2)", "공배수 중 가장 작은 수", "두 수의 곱(24)은 공배수지만 가장 작지는 않음"],
    model: "4의 배수는 4, 8, 12, 16, …이고 6의 배수는 6, 12, 18, …이에요. 둘 다에 처음 나오는 공배수가 12라서 최소공배수는 12예요. 24도 공배수지만 가장 작은 수는 아니에요.",
  },

  // ── 분수 ──────────────────────────────────────────────
  {
    id: "FRAC_MEANING.denominator-whole",
    skillId: "FRAC_MEANING",
    prompt: "전체를 똑같이 4로 나눈 것 중의 3을 {3/4}로 쓰는 까닭은 무엇일까요?",
    correct: "분모에는 전체를 똑같이 나눈 조각 수 4를, 분자에는 그중 3조각을 쓰기 때문이에요.",
    distractors: [
      { text: "분모에는 남은 조각 수 1을 써야 하니까 {3/1}이 맞아요.", misconceptionId: "FRAC_PART_PART" },
      { text: "분모에는 고른 조각 수, 분자에는 전체 조각 수를 쓰니까 {4/3}이 맞아요.", misconceptionId: "FRAC_INVERTED" },
    ],
    rubric: ["분모는 전체를 똑같이 나눈 조각 수(4)", "분자는 그중 고른 조각 수(3)"],
    model: "분수의 분모는 전체를 똑같이 몇으로 나누었는지, 분자는 그중 몇 개인지를 나타내요. 똑같이 4로 나눈 것 중의 3이라서 {3/4}이에요.",
  },
  {
    id: "FRAC_COMPARE.unit-fractions",
    skillId: "FRAC_COMPARE",
    prompt: "{1/3}과 {1/5} 중 어느 것이 더 클까요? 까닭과 함께 답해 보세요.",
    correct: "{1/3}이 더 커요. 똑같은 크기를 3조각으로 나눈 한 조각이 5조각으로 나눈 한 조각보다 크기 때문이에요.",
    distractors: [
      { text: "{1/5}이 더 커요. 5가 3보다 크기 때문이에요.", misconceptionId: "FRAC_BIGGER_DEN_BIGGER" },
      { text: "두 분수는 크기가 같아요. 분자가 모두 1이기 때문이에요." },
    ],
    rubric: ["{1/3}이 더 큼", "분모가 작을수록 덜 잘게 나누어 한 조각이 큼", "같은 크기의 전체를 나눈 한 조각끼리 비교함"],
    model: "{1/3}이 더 커요. 같은 크기의 피자를 3조각으로 나눈 한 조각이 5조각으로 나눈 한 조각보다 크니까요. 분자가 1로 같을 때는 분모가 작을수록 커요.",
  },
  {
    id: "FRAC_OF_QUANTITY.all-parts",
    skillId: "FRAC_OF_QUANTITY",
    prompt: "12의 {3/4}이 3이 아니라 9인 까닭은 무엇일까요?",
    correct: "12를 4묶음으로 똑같이 나누면 한 묶음이 3이고, {3/4}은 그중 3묶음이라 9이기 때문이에요.",
    distractors: [
      { text: "12를 4로 나눈 3이 답이니까 사실은 3이 맞아요.", misconceptionId: "FRAC_OF_UNIT_ONLY" },
      { text: "12에서 3을 빼면 9이기 때문이에요." },
    ],
    rubric: ["12를 4묶음으로 똑같이 나눔(한 묶음은 3)", "{3/4}은 3묶음이므로 3×3=9"],
    model: "12의 {1/4}은 12를 4묶음으로 나눈 한 묶음이라 3이에요. {3/4}은 그런 묶음 3개라서 3×3=9예요.",
  },
  {
    id: "FRAC_MIXED_IMPROPER.whole-as-thirds",
    skillId: "FRAC_MIXED_IMPROPER",
    prompt: "{2 1/3}을 가분수 {7/3}로 나타내는 까닭은 무엇일까요?",
    correct: "자연수 1은 {3/3}이라서 2는 {6/3}이고, 여기에 {1/3}을 더하면 {7/3}이기 때문이에요.",
    distractors: [
      { text: "자연수 2와 분자 1을 더해서 {3/3}이 맞아요.", misconceptionId: "MIXED_TO_IMPROPER_ADD" },
      { text: "자연수 2를 분자 앞에 붙여 써서 {21/3}이 맞아요." },
    ],
    rubric: ["자연수 1은 {3/3}", "자연수 2는 {6/3}", "{6/3}+{1/3}={7/3}"],
    model: "자연수 1은 {3/3}이에요. 그래서 2는 {3/3}이 2개인 {6/3}이고, {1/3}을 더하면 {7/3}이 돼요.",
  },
  {
    id: "FRAC_SAME_DEN_ADD.keep-denominator",
    skillId: "FRAC_SAME_DEN_ADD",
    prompt: "{2/5}+{1/5}를 계산할 때 분모끼리는 더하지 않는 까닭은 무엇일까요?",
    correct: "분모 5는 조각의 크기를 나타내요. 같은 크기 조각 2개와 1개를 모으면 3개라서 {3/5}이에요.",
    distractors: [
      { text: "분모끼리도 더해야 하니까 {3/10}이 맞아요.", misconceptionId: "FRAC_ADD_DENOMINATORS" },
      { text: "분모가 같을 때는 분모끼리 곱해야 하기 때문이에요." },
    ],
    rubric: ["분모는 조각의 크기(전체를 5로 나눔)", "같은 크기 조각의 개수(분자)만 더함", "조각의 크기는 그대로라서 {3/5}"],
    model: "{1/5}짜리 조각이 2개 있고 1개를 더 모으면 {1/5}짜리 조각이 3개예요. 조각의 크기(분모)는 그대로라서 {3/5}이에요.",
  },
  {
    id: "FRAC_EQUIV.multiply-both",
    skillId: "FRAC_EQUIV",
    prompt: "{2/3}과 크기가 같은 분수를 만들 때 분자와 분모에 같은 수를 곱하는 까닭은 무엇일까요?",
    correct: "조각을 똑같이 더 잘게 나누면 전체 조각 수와 고른 조각 수가 같은 배로 늘어나서, 차지하는 크기는 그대로이기 때문이에요.",
    distractors: [
      { text: "분자와 분모에 같은 수를 더해도 크기가 같기 때문이에요.", misconceptionId: "FRAC_EQUIV_ADD_SAME" },
      { text: "같은 수를 곱하면 분수가 더 커지기 때문이에요." },
    ],
    rubric: ["분자와 분모에 같은 수를 곱함", "조각을 똑같이 더 잘게 나눈 것과 같음", "전체에서 차지하는 크기는 같음({2/3}={4/6})"],
    model: "{2/3}의 조각을 모두 반으로 자르면 전체는 6조각, 색칠한 부분은 4조각이 되어 {4/6}이에요. 크기는 그대로예요. 그래서 분자와 분모에 같은 수를 곱해요.",
  },
  {
    id: "FRAC_DIFF_DEN_ADD.common-denominator",
    skillId: "FRAC_DIFF_DEN_ADD",
    prompt: "{1/2}+{1/3}을 계산할 때 먼저 통분하는 까닭은 무엇일까요?",
    correct: "분모가 다르면 조각의 크기가 달라서 바로 더할 수 없어요. 같은 크기 조각(분모 6)으로 바꾼 뒤 더해야 하기 때문이에요.",
    distractors: [
      { text: "분자끼리, 분모끼리 더하면 되니까 {2/5}가 맞아요.", misconceptionId: "FRAC_ADD_DENOMINATORS" },
      { text: "더 큰 분모 3에 맞춰서 분자만 더하면 {2/3}이에요." },
    ],
    rubric: ["분모가 다르면 조각의 크기가 다름", "통분해서 같은 크기 조각으로 바꿈", "{3/6}+{2/6}={5/6}"],
    model: "{1/2}과 {1/3}은 조각의 크기가 달라요. 둘 다 분모 6으로 바꾸면 {3/6}과 {2/6}이 되고, 같은 크기 조각끼리 더해 {5/6}이에요.",
  },
  {
    id: "FRAC_MUL.whole-times-numerator",
    skillId: "FRAC_MUL",
    prompt: "{2/5}×3을 계산할 때 분모에는 3을 곱하지 않는 까닭은 무엇일까요?",
    correct: "{2/5}×3은 {2/5}를 3번 더한 것이라, 조각의 크기(분모)는 그대로이고 조각 수(분자)만 3배가 되기 때문이에요.",
    distractors: [
      { text: "분자와 분모에 모두 3을 곱해야 하니까 {6/15}가 맞아요.", misconceptionId: "FRAC_MUL_WHOLE_TO_BOTH" },
      { text: "분모에만 3을 곱해야 하니까 {2/15}가 맞아요." },
    ],
    rubric: ["{2/5}를 3번 더한 것", "분모(조각의 크기)는 그대로", "분자만 3배가 되어 {6/5}"],
    model: "{2/5}×3은 {2/5}+{2/5}+{2/5}예요. {1/5}짜리 조각이 6개가 되니 {6/5}이에요. 조각의 크기인 분모는 바뀌지 않아요.",
  },
  {
    id: "FRAC_DIV_NAT.half",
    skillId: "FRAC_DIV_NAT",
    prompt: "어떤 친구가 {3/4}÷2를 {6/4}라고 했어요. 친구의 생각이 맞을까요? 까닭과 함께 답해 보세요.",
    correct: "틀려요. 2로 나누면 똑같이 둘로 나눈 것이라 {3/4}의 반인 {3/8}이 되어야 해요.",
    distractors: [
      { text: "맞아요. 나눗셈도 분자에 2를 곱하면 돼요.", misconceptionId: "FRAC_DIV_MULTIPLIED" },
      { text: "틀려요. 분모를 2로 나누어 {3/2}가 돼요." },
    ],
    rubric: ["친구의 생각이 틀렸다고 함", "÷2는 똑같이 둘로 나누는 것이라 작아져야 함", "{3/4}의 반은 {3/8}"],
    model: "틀렸어요. 2로 나누면 크기가 반이 되어야 하는데 {6/4}는 오히려 두 배예요. {3/4}을 똑같이 둘로 나누면 {3/8}이에요.",
  },
  {
    id: "FRAC_DIV_FRAC.flip-divisor",
    skillId: "FRAC_DIV_FRAC",
    prompt: "{2/3}÷{4/5}를 {2/3}×{5/4}로 바꾸어 계산하는 까닭은 무엇일까요?",
    correct: "분수로 나누는 것은 나누는 분수의 분모와 분자를 바꾼 분수를 곱하는 것과 같기 때문이에요. 앞의 분수는 그대로 두어요.",
    distractors: [
      { text: "분수의 나눗셈은 그냥 곱하면 되니까 {2/3}×{4/5}로 계산해요.", misconceptionId: "FRAC_DIV_NO_INVERT" },
      { text: "앞의 분수를 뒤집어 {3/2}×{4/5}로 계산해야 해요.", misconceptionId: "FRAC_DIV_INVERT_WRONG" },
    ],
    rubric: ["나누는 분수({4/5})의 분모와 분자를 바꿈({5/4})", "곱셈으로 바꾸어 계산함", "나누어지는 분수({2/3})는 그대로 둠"],
    model: "{4/5}로 나누는 것은 {5/4}를 곱하는 것과 같아요. 그래서 나누는 분수의 분모와 분자만 바꾸어 {2/3}×{5/4}로 계산하고, 앞의 분수 {2/3}은 그대로 두어요.",
  },

  // ── 소수 ──────────────────────────────────────────────
  {
    id: "DEC_HUNDREDTHS.compare-places",
    skillId: "DEC_HUNDREDTHS",
    prompt: "0.3과 0.25 중 어느 것이 더 클까요? 까닭과 함께 답해 보세요.",
    correct: "0.3이 더 커요. 소수 첫째 자리끼리 비교하면 3이 2보다 크기 때문이에요.",
    distractors: [
      { text: "0.25가 더 커요. 소수점 아래 숫자가 더 많기 때문이에요.", misconceptionId: "DEC_LONGER_IS_BIGGER" },
      { text: "0.25가 더 커요. 25가 3보다 크기 때문이에요.", misconceptionId: "DEC_LONGER_IS_BIGGER" },
    ],
    rubric: ["0.3이 더 큼", "소수 첫째 자리부터 비교함(3>2)", "0.3=0.30처럼 자리 수를 맞춰 비교함"],
    model: "0.3이 더 커요. 소수는 소수 첫째 자리부터 비교해요. 0.3의 첫째 자리 3이 0.25의 첫째 자리 2보다 커요. 0.3을 0.30으로 쓰면 30과 25를 비교하는 것과 같아요.",
  },
  {
    id: "DEC_ADD.align-points",
    skillId: "DEC_ADD",
    prompt: "1.5+0.25를 세로로 계산할 때 소수점끼리 맞추어 쓰는 까닭은 무엇일까요?",
    correct: "같은 자리끼리(일의 자리는 일의 자리끼리, 소수 첫째 자리는 소수 첫째 자리끼리) 더해야 하기 때문이에요.",
    distractors: [
      { text: "끝자리를 맞추어 써야 계산이 맞기 때문이에요.", misconceptionId: "DEC_ALIGN_RIGHT" },
      { text: "소수점은 빼고 15+25를 계산하면 되기 때문이에요." },
    ],
    rubric: ["소수점끼리 맞춤", "같은 자리끼리 더함", "1.50+0.25=1.75"],
    model: "소수점끼리 맞추면 같은 자리 숫자가 위아래로 놓여요. 1.5를 1.50으로 생각하고 같은 자리끼리 더하면 1.75예요.",
  },
  {
    id: "DEC_MUL.point-places",
    skillId: "DEC_MUL",
    prompt: "0.3×0.2가 0.6이 아니라 0.06인 까닭은 무엇일까요?",
    correct: "0.3의 0.2배라서 0.3보다 작아야 하고, 3×2=6에 소수점 아래 자리가 1+1=2개 생기기 때문이에요.",
    distractors: [
      { text: "소수 한 자리 수끼리 곱하면 소수 한 자리 수가 되니까 0.6이 맞아요.", misconceptionId: "DEC_MUL_POINT" },
      { text: "3×2=6이니까 소수점 없이 6이라고 써도 돼요." },
    ],
    rubric: ["0.3의 0.2배라 0.3보다 작음", "소수점 아래 자리 수는 1+1=2", "3×2=6이므로 0.06"],
    model: "0.3×0.2는 0.3의 0.2배라서 0.3보다 작아요. 3×2=6이고 두 수의 소수점 아래 자리 수를 더하면 2자리라서 0.06이에요.",
  },
  {
    id: "DEC_DIV_NAT.point-in-quotient",
    skillId: "DEC_DIV_NAT",
    prompt: "4.8÷4의 몫이 12가 아니라 1.2인 까닭은 무엇일까요?",
    correct: "4.8을 4로 나누면 4.8보다 작아야 해요. 48÷4=12처럼 계산하되 몫에도 소수점을 찍어 1.2가 돼요.",
    distractors: [
      { text: "48÷4=12이니까 소수점은 빼고 12라고 써도 돼요.", misconceptionId: "DEC_DIV_IGNORE_POINT" },
      { text: "4.8에서 4를 빼면 0.8이라서 몫이 1.2예요." },
    ],
    rubric: ["4.8을 4로 나눈 몫은 4.8보다 작아야 함", "48÷4=12를 이용하되 몫에 소수점을 찍음", "몫은 1.2"],
    model: "4.8은 0.1이 48개예요. 48÷4=12이니까 0.1이 12개, 즉 1.2예요. 4.8을 4로 나눈 몫이 12처럼 클 수는 없어요.",
  },
  {
    id: "DEC_DIV_DEC.scale-both",
    skillId: "DEC_DIV_DEC",
    prompt: "1.2÷0.4를 12÷4로 바꾸어 계산해도 되는 까닭은 무엇일까요?",
    correct: "나누어지는 수와 나누는 수에 똑같이 10을 곱하면 몫은 그대로이기 때문이에요.",
    distractors: [
      { text: "나누어지는 수에만 10을 곱하면 되니까 12÷0.4로 계산해요.", misconceptionId: "DEC_DIV_POINT" },
      { text: "소수점을 그냥 지우면 되고, 몫에는 다시 10을 곱해 30이에요." },
    ],
    rubric: ["두 수에 똑같이 10을 곱함", "그래도 몫은 변하지 않음", "12÷4=3"],
    model: "1.2와 0.4에 똑같이 10을 곱하면 12와 4가 돼요. 두 수를 똑같이 늘리면 몫은 그대로라서 1.2÷0.4=12÷4=3이에요.",
  },
];

const BY_SKILL = new Map<string, ReasonSpec[]>();
for (const r of REASONS) BY_SKILL.set(r.skillId, [...(BY_SKILL.get(r.skillId) ?? []), r]);
const BY_ID = new Map(REASONS.map((r) => [r.id, r]));

export function reasonsFor(skillId: string): ReasonSpec[] {
  return BY_SKILL.get(skillId) ?? [];
}

export function hasReasons(skillId: string): boolean {
  return BY_SKILL.has(skillId);
}

export function getReason(id: string): ReasonSpec | undefined {
  return BY_ID.get(id);
}
