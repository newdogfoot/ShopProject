/**
 * Common misconceptions in elementary numbers and operations. Generators predict
 * the wrong answer each one produces, so a matching answer is diagnosed by code.
 */
export interface Misconception {
  id: string;
  /** Short name for guardians. */
  name: string;
  /** What the child should notice (used when the explanation starts from the misconception). */
  childExplain: string;
  /** Plain-language description for guardians. */
  parentExplain: string;
  /** One thing a guardian can do at home. */
  parentTip: string;
}

export const MISCONCEPTIONS: Misconception[] = [
  // 자릿값
  {
    id: "PLACE_VALUE_SWAP",
    name: "묶음과 낱개를 바꿔 씀",
    childExplain: "10개씩 묶음의 수는 앞(십의 자리)에, 낱개의 수는 뒤(일의 자리)에 써요. 묶음 3개와 낱개 4개는 34예요.",
    parentExplain: "10개씩 묶음 수와 낱개 수의 자리를 바꿔 씁니다(3묶음 4개 → 43).",
    parentTip: "동전이나 블록을 10개씩 묶어 보고, 묶음 수를 먼저 말하게 해 주세요.",
  },
  {
    id: "PLACE_VALUE_ZERO_OMIT",
    name: "빈 자리의 0을 빠뜨림",
    childExplain: "어떤 자리에 아무것도 없으면 그 자리에 0을 꼭 써야 해요. 100이 3개, 1이 5개면 305예요. 0이 없으면 35가 되어 버려요.",
    parentExplain: "빈 자리를 0으로 채우지 않아 수가 작아집니다(백 3개, 일 5개 → 35).",
    parentTip: "자릿값 칸(백·십·일)을 그려 놓고 빈칸에 0을 쓰는 연습을 해 주세요.",
  },
  {
    id: "PLACE_VALUE_WRITE_AS_HEARD",
    name: "들리는 대로 숫자를 이어 씀",
    childExplain: "'칠백사'는 700과 4를 이어 쓰는 게 아니라, 백의 자리 7과 일의 자리 4로 704예요. 각 숫자를 자기 자리에 써요.",
    parentExplain: "읽은 말을 그대로 숫자로 이어 씁니다(칠백사 → 7004).",
    parentTip: "수를 말로 불러 주고 자릿값 칸에 숫자를 하나씩 채우게 해 주세요.",
  },
  {
    id: "PLACE_VALUE_DIGIT_ONLY",
    name: "숫자가 나타내는 값 대신 숫자만 씀",
    childExplain: "462에서 숫자 6은 십의 자리에 있으니까 60을 나타내요. 숫자가 어느 자리에 있는지 보고 값을 생각해요.",
    parentExplain: "숫자 자체와 그 숫자가 자리에 따라 나타내는 값을 구분하지 못합니다(462의 6 → 6).",
    parentTip: "같은 숫자 카드를 자리만 바꿔 놓으며 값이 어떻게 달라지는지 이야기해 주세요.",
  },
  // 덧셈·뺄셈
  {
    id: "ADD_NO_CARRY",
    name: "받아올림을 빠뜨림",
    childExplain: "같은 자리끼리 더한 값이 10이거나 10보다 크면, 10을 윗자리로 받아올려야 해요. 받아올린 1을 윗자리 계산에 꼭 더해요.",
    parentExplain: "일의 자리 합이 10을 넘을 때 윗자리로 1을 올리지 않습니다(47+38 → 75).",
    parentTip: "받아올린 1을 작게 적어 두는 습관을 함께 연습해 주세요.",
  },
  {
    id: "ADD_CARRY_WRITE_ALL",
    name: "자리마다 합을 그대로 씀",
    childExplain: "한 자리에는 숫자를 하나만 쓸 수 있어요. 7+8=15라면 5만 쓰고, 10은 윗자리로 받아올려요.",
    parentExplain: "자리별 합을 받아올림 없이 그대로 이어 씁니다(47+38 → 715).",
    parentTip: "자릿값 칸이 있는 종이에 한 칸에 숫자 하나만 쓰도록 도와주세요.",
  },
  {
    id: "ADD_PLACE_MISALIGN",
    name: "자리를 맞추지 않고 계산",
    childExplain: "더할 때는 일의 자리는 일의 자리끼리, 십의 자리는 십의 자리끼리 맞춰야 해요. 34+5에서 5는 일의 자리 4와 더해요.",
    parentExplain: "한 자리 수를 십의 자리와 더하는 등 자리를 맞추지 않습니다(34+5 → 84).",
    parentTip: "세로셈을 쓸 때 일의 자리를 오른쪽 끝에 맞춰 쓰게 해 주세요.",
  },
  {
    id: "SUB_SMALLER_FROM_LARGER",
    name: "자리마다 큰 수에서 작은 수를 뺌",
    childExplain: "위의 수가 더 작을 때 아래 수에서 위의 수를 빼면 안 돼요. 윗자리에서 10을 받아내려 와서 계산해요.",
    parentExplain: "받아내림 대신 자리마다 큰 수에서 작은 수를 뺍니다(52−38 → 26).",
    parentTip: "십 모형 하나를 낱개 10개로 바꾸는 활동(동전 바꾸기)을 함께 해 주세요.",
  },
  {
    id: "SUB_BORROW_NO_DECREMENT",
    name: "받아내린 뒤 윗자리를 줄이지 않음",
    childExplain: "윗자리에서 10을 받아내렸다면, 윗자리 수는 1만큼 작아져요. 52에서 받아내리면 십의 자리 5는 4가 돼요.",
    parentExplain: "받아내림은 했지만 윗자리에서 1을 빼지 않습니다(52−38 → 24).",
    parentTip: "받아내린 자리의 숫자에 빗금을 긋고 1 작은 수를 적게 해 주세요.",
  },
  // 곱셈
  {
    id: "MUL_ADDED_INSTEAD",
    name: "곱셈 대신 덧셈을 함",
    childExplain: "3씩 4묶음은 3을 4번 더하는 거예요: 3+3+3+3=12. 3과 4를 한 번 더하는 것(7)과 달라요.",
    parentExplain: "곱셈 상황에서 두 수를 그냥 더합니다(3×4 → 7).",
    parentTip: "과자를 몇 개씩 몇 묶음으로 놓고 모두 몇 개인지 세어 보게 해 주세요.",
  },
  {
    id: "MUL_NO_CARRY",
    name: "곱셈에서 올림을 빠뜨림",
    childExplain: "일의 자리 곱이 10을 넘으면 십의 자리로 올림해요. 올린 수는 십의 자리 곱에 더해요.",
    parentExplain: "자리별 곱에서 생긴 올림을 더하지 않습니다(27×3 → 61).",
    parentTip: "올림한 수를 작게 적고, 다음 자리 곱에 더했는지 확인하게 해 주세요.",
  },
  {
    id: "MUL_CARRY_WRONG_ORDER",
    name: "올림을 먼저 더하고 곱함",
    childExplain: "올림한 수는 곱한 다음에 더해요. 27×3은 20×3=60에 21을 더해 81이에요. 올림을 먼저 더하고 곱하면 안 돼요.",
    parentExplain: "올림한 수를 윗자리 숫자에 먼저 더한 뒤 곱합니다(27×3 → 121).",
    parentTip: "'곱하고 나서 더하기' 순서를 말로 말하며 풀게 해 주세요.",
  },
  {
    id: "MUL_PARTIAL_NO_SHIFT",
    name: "십의 자리 곱을 한 칸 밀어 쓰지 않음",
    childExplain: "23×14에서 23×1은 사실 23×10이에요. 그래서 230으로, 한 칸 왼쪽으로 밀어 써야 해요.",
    parentExplain: "두 자리 수를 곱할 때 십의 자리 곱을 10배로 쓰지 않습니다(23×14 → 115).",
    parentTip: "14를 10과 4로 나누어 두 번 곱한 뒤 더해 보게 해 주세요.",
  },
  {
    id: "MUL_ONLY_SAME_PLACE",
    name: "같은 자리끼리만 곱함",
    childExplain: "곱셈은 덧셈처럼 같은 자리끼리만 계산하면 안 돼요. 23×14는 23×4와 23×10을 각각 구해서 더해요.",
    parentExplain: "덧셈처럼 같은 자리 숫자끼리만 곱합니다(23×14 → 212).",
    parentTip: "직사각형 넓이 그림(가로 23, 세로 14)을 나누어 그려 보게 해 주세요.",
  },
  // 나눗셈
  {
    id: "DIV_OP_CONFUSION",
    name: "나눗셈 대신 다른 연산을 함",
    childExplain: "나눗셈은 똑같이 나누는 거예요. 12÷3은 12를 3묶음으로 똑같이 나누면 한 묶음에 몇 개인지 묻는 거예요.",
    parentExplain: "나눗셈 상황에서 빼거나 곱합니다(12÷3 → 9 또는 36).",
    parentTip: "간식을 사람 수만큼 똑같이 나누어 보는 놀이를 해 주세요.",
  },
  {
    id: "DIV_REMAINDER_TOO_BIG",
    name: "나머지가 나누는 수보다 큼",
    childExplain: "나머지는 나누는 수보다 항상 작아야 해요. 나머지가 더 크면 몫을 1 더 크게 할 수 있어요.",
    parentExplain: "나머지가 나누는 수보다 큰 채로 답합니다(47÷5 → 8…7).",
    parentTip: "답을 낸 뒤 '나머지 < 나누는 수'인지 스스로 확인하게 해 주세요.",
  },
  {
    id: "DIV_ZERO_IN_QUOTIENT_OMITTED",
    name: "몫 가운데 0을 빠뜨림",
    childExplain: "나누어지는 수의 어떤 자리를 나눌 수 없으면 그 자리 몫에 0을 써요. 618÷6은 103이에요.",
    parentExplain: "몫의 가운데 자리에 0을 쓰지 않습니다(618÷6 → 13).",
    parentTip: "몫 × 나누는 수가 원래 수가 되는지 곱해서 확인하게 해 주세요.",
  },
  // 혼합 계산
  {
    id: "MIX_LEFT_TO_RIGHT",
    name: "앞에서부터 차례로 계산",
    childExplain: "곱셈과 나눗셈은 덧셈과 뺄셈보다 먼저 계산해요. 2+3×4는 3×4=12를 먼저 하고 2를 더해 14예요.",
    parentExplain: "계산 순서를 무시하고 왼쪽부터 계산합니다(2+3×4 → 20).",
    parentTip: "먼저 계산할 부분에 밑줄을 긋고 시작하게 해 주세요.",
  },
  {
    id: "MIX_IGNORE_PARENS",
    name: "괄호를 먼저 계산하지 않음",
    childExplain: "괄호 안은 가장 먼저 계산해요. (2+3)×4는 2+3=5를 먼저 하고 4를 곱해 20이에요.",
    parentExplain: "괄호를 무시하고 계산합니다((2+3)×4 → 14).",
    parentTip: "괄호 부분을 색칠하고 그 부분부터 계산하게 해 주세요.",
  },
  // 약수와 배수
  {
    id: "FACTOR_MULTIPLE_CONFUSE",
    name: "약수와 배수를 헷갈림",
    childExplain: "약수는 그 수를 나누어떨어지게 하는 수예요(12의 약수: 1, 2, 3, 4, 6, 12). 배수는 그 수를 1배, 2배, 3배… 한 수예요(12, 24, 36…).",
    parentExplain: "약수를 구하라는 문제에 배수를 씁니다.",
    parentTip: "'약수는 작거나 같은 수, 배수는 크거나 같은 수'로 구분해 보게 해 주세요.",
  },
  {
    id: "FACTOR_MISSING_TRIVIAL",
    name: "1이나 자기 자신을 약수에서 빠뜨림",
    childExplain: "1과 그 수 자신도 항상 약수예요. 12÷1=12, 12÷12=1처럼 나누어떨어지니까요.",
    parentExplain: "약수를 쓸 때 1이나 자기 자신을 빠뜨립니다.",
    parentTip: "약수를 1부터 짝지어(1과 12, 2와 6, 3과 4) 찾게 해 주세요.",
  },
  {
    id: "GCD_LCM_CONFUSE",
    name: "최대공약수와 최소공배수를 헷갈림",
    childExplain: "최대공약수는 두 수를 모두 나누어떨어지게 하는 가장 큰 수, 최소공배수는 두 수의 배수 중 공통인 가장 작은 수예요.",
    parentExplain: "최대공약수를 구할 때 최소공배수를 쓰거나 그 반대로 씁니다.",
    parentTip: "'최대공약수는 두 수보다 작거나 같고, 최소공배수는 크거나 같다'를 확인하게 해 주세요.",
  },
  {
    id: "LCM_AS_PRODUCT",
    name: "최소공배수를 두 수의 곱으로 생각함",
    childExplain: "두 수의 곱은 공배수이지만 가장 작은 공배수가 아닐 수 있어요. 4와 6의 최소공배수는 24가 아니라 12예요.",
    parentExplain: "최소공배수를 두 수의 곱으로 구합니다(4와 6 → 24).",
    parentTip: "두 수의 배수를 나란히 써서 처음 겹치는 수를 찾아보게 해 주세요.",
  },
  // 분수
  {
    id: "FRAC_PART_PART",
    name: "부분과 나머지 부분을 비교함",
    childExplain: "분모는 전체를 똑같이 나눈 조각 수예요. 4조각 중 3조각을 색칠했다면 3/4이에요. 색칠 안 한 조각 수가 분모가 아니에요.",
    parentExplain: "전체 대신 남은 부분을 분모로 씁니다(4조각 중 3조각 → 3/1).",
    parentTip: "피자 조각을 나누며 '전체 몇 조각 중 몇 조각'으로 말하게 해 주세요.",
  },
  {
    id: "FRAC_INVERTED",
    name: "분자와 분모를 바꿔 씀",
    childExplain: "분수는 아래(분모)에 전체 조각 수, 위(분자)에 그중 몇 조각인지를 써요.",
    parentExplain: "분자와 분모의 위치를 바꿔 씁니다(4조각 중 3조각 → 4/3).",
    parentTip: "'아래는 전체, 위는 부분'을 함께 말하며 써 보게 해 주세요.",
  },
  {
    id: "FRAC_BIGGER_DEN_BIGGER",
    name: "분모가 크면 더 큰 분수라고 생각함",
    childExplain: "단위분수는 분모가 클수록 더 잘게 나눈 거라 한 조각이 더 작아요. 1/3이 1/5보다 커요.",
    parentExplain: "단위분수에서 분모가 큰 수가 더 크다고 판단합니다(1/5 > 1/3).",
    parentTip: "같은 크기 종이를 3조각, 5조각으로 접어 한 조각 크기를 비교해 주세요.",
  },
  {
    id: "FRAC_OF_UNIT_ONLY",
    name: "단위분수만큼만 구함",
    childExplain: "12의 3/4은 12를 4묶음으로 나눈 것 중 3묶음이에요. 한 묶음(3)만 구하고 멈추지 말고 3묶음(9)을 구해요.",
    parentExplain: "전체의 분수만큼을 구할 때 분모로 나누기만 하고 분자만큼 곱하지 않습니다(12의 3/4 → 3).",
    parentTip: "바둑돌 12개를 4묶음으로 나누고 3묶음을 세어 보게 해 주세요.",
  },
  {
    id: "MIXED_TO_IMPROPER_ADD",
    name: "대분수를 가분수로 바꿀 때 자연수를 그냥 더함",
    childExplain: "2와 1/3에서 자연수 2는 3/3이 2개, 즉 6/3이에요. 그래서 2와 1/3은 6/3+1/3=7/3이에요.",
    parentExplain: "대분수를 가분수로 바꿀 때 자연수와 분자를 그냥 더합니다(2와 1/3 → 3/3).",
    parentTip: "분수 막대로 자연수 1을 조각으로 바꿔 세어 보게 해 주세요.",
  },
  {
    id: "FRAC_ADD_DENOMINATORS",
    name: "분자끼리, 분모끼리 더함",
    childExplain: "분모는 조각의 크기라서 더하지 않아요. 분모가 같으면 분자끼리만 더하고, 분모가 다르면 먼저 통분해요.",
    parentExplain: "분수를 더할 때 분모끼리도 더합니다(1/2+1/3 → 2/5).",
    parentTip: "피자 반 판과 1/3판을 더하면 반 판보다 커야 하는지 함께 생각해 보세요.",
  },
  {
    id: "FRAC_SUB_SMALLER_FROM_LARGER",
    name: "분수 부분에서 큰 수에서 작은 수를 뺌",
    childExplain: "분자끼리 뺄 수 없으면 자연수에서 1을 받아내려 분수로 바꿔요. 3과 1/5에서 1을 받아내리면 2와 6/5가 돼요.",
    parentExplain: "대분수 뺄셈에서 받아내림 없이 분자끼리 큰 수에서 작은 수를 뺍니다.",
    parentTip: "자연수 1을 분수(5/5)로 바꾸는 과정을 그림으로 그려 보게 해 주세요.",
  },
  {
    id: "FRAC_SUB_DENOMINATORS",
    name: "분자끼리, 분모끼리 뺌",
    childExplain: "분모는 조각의 크기라 빼지 않아요. 통분해서 분모를 같게 만든 뒤 분자끼리 빼요.",
    parentExplain: "분수를 뺄 때 분모끼리도 뺍니다(3/4−1/2 → 2/2).",
    parentTip: "분수 막대 두 개를 겹쳐 차이를 직접 비교해 보게 해 주세요.",
  },
  {
    id: "FRAC_EQUIV_ADD_SAME",
    name: "분자·분모에 같은 수를 더하면 같은 분수라고 생각함",
    childExplain: "크기가 같은 분수를 만들려면 분자와 분모에 같은 수를 곱하거나 같은 수로 나누어야 해요. 더하면 크기가 달라져요.",
    parentExplain: "분자와 분모에 같은 수를 더해 크기가 같은 분수를 만듭니다(2/3 → 11/12).",
    parentTip: "분수 막대를 더 잘게 나누어도 색칠한 양은 같다는 것을 보여 주세요.",
  },
  {
    id: "FRAC_MUL_WHOLE_TO_BOTH",
    name: "자연수를 분자와 분모 모두에 곱함",
    childExplain: "2/5×3은 2/5를 3번 더한 거예요. 분자만 3배가 되어 6/5예요. 분모까지 곱하면 크기가 그대로예요.",
    parentExplain: "(분수)×(자연수)에서 분자와 분모에 모두 곱합니다(2/5×3 → 6/15).",
    parentTip: "2/5를 세 번 더해 보고 곱셈 결과와 비교하게 해 주세요.",
  },
  {
    id: "FRAC_MUL_MIXED_PARTS",
    name: "대분수의 자연수와 분수를 따로 곱함",
    childExplain: "대분수끼리 곱할 때는 먼저 가분수로 바꾼 다음 곱해요. 자연수끼리, 분수끼리 따로 곱하면 빠지는 부분이 생겨요.",
    parentExplain: "대분수 곱셈에서 자연수끼리, 분수끼리 따로 곱합니다.",
    parentTip: "직사각형 넓이 그림으로 빠진 부분이 있는지 확인하게 해 주세요.",
  },
  {
    id: "FRAC_DIV_INVERTED",
    name: "나눗셈의 몫을 분수로 쓸 때 분자·분모를 바꿈",
    childExplain: "3÷4는 3을 4로 나눈 것이라 3/4이에요. 나누어지는 수가 분자, 나누는 수가 분모예요.",
    parentExplain: "(자연수)÷(자연수)의 몫을 분수로 쓸 때 분자와 분모를 바꿉니다(3÷4 → 4/3).",
    parentTip: "피자 3판을 4명이 나누면 한 명이 1판보다 적게 먹는지 생각해 보게 해 주세요.",
  },
  {
    id: "FRAC_DIV_MULTIPLIED",
    name: "분수를 자연수로 나누는데 곱함",
    childExplain: "나누면 크기가 작아져야 해요. 3/4÷2는 3/4의 반이라 3/8이에요. 2를 곱하면 오히려 커져요.",
    parentExplain: "(분수)÷(자연수)에서 분자에 자연수를 곱합니다(3/4÷2 → 6/4).",
    parentTip: "결과가 원래 수보다 작아야 하는지 먼저 어림하게 해 주세요.",
  },
  {
    id: "FRAC_DIV_NO_INVERT",
    name: "분수의 나눗셈을 곱셈처럼 계산",
    childExplain: "분수로 나눌 때는 나누는 분수의 분모와 분자를 바꾸어 곱해요. 2/3÷4/5 = 2/3×5/4 예요.",
    parentExplain: "(분수)÷(분수)를 역수로 바꾸지 않고 그대로 곱합니다.",
    parentTip: "'몇 번 들어가나'로 생각해 보게 해 주세요(3/4 안에 1/8이 몇 번?).",
  },
  {
    id: "FRAC_DIV_INVERT_WRONG",
    name: "나누어지는 분수를 뒤집음",
    childExplain: "분모와 분자를 바꾸는 것은 나누는 수(÷ 뒤의 분수)예요. 앞의 분수는 그대로 두어요.",
    parentExplain: "(분수)÷(분수)에서 앞의 분수를 뒤집습니다.",
    parentTip: "÷ 뒤의 분수에만 동그라미를 치고 뒤집게 해 주세요.",
  },
  // 소수
  {
    id: "DEC_PLACE_VALUE",
    name: "소수의 자릿값을 헷갈림",
    childExplain: "0.1이 10개면 1이에요. 그래서 0.1이 14개면 1.4예요. 소수점 아래 첫째 자리는 0.1이 몇 개인지를 나타내요.",
    parentExplain: "소수의 자릿값을 잘못 이해합니다(0.1이 14개 → 0.14).",
    parentTip: "10원짜리 동전을 0.1로 보고 100원(=1)으로 바꿔 보는 놀이를 해 주세요.",
  },
  {
    id: "DEC_LONGER_IS_BIGGER",
    name: "소수점 아래 자릿수가 많으면 큰 수라고 생각함",
    childExplain: "0.25와 0.3은 소수 첫째 자리부터 비교해요. 2보다 3이 크니까 0.3이 더 커요. 자릿수가 많다고 큰 수가 아니에요.",
    parentExplain: "소수점 아래 숫자가 길수록 큰 수라고 판단합니다(0.25 > 0.3).",
    parentTip: "0.3을 0.30으로 바꿔 쓰고 비교해 보게 해 주세요.",
  },
  {
    id: "DEC_ALIGN_RIGHT",
    name: "소수점이 아니라 끝자리를 맞춰 계산",
    childExplain: "소수를 더하고 뺄 때는 소수점끼리 맞춰서 같은 자리끼리 계산해요. 끝자리를 맞추면 자리가 어긋나요.",
    parentExplain: "소수의 덧셈·뺄셈에서 소수점 대신 끝자리를 맞춥니다(1.2+0.35 → 0.47).",
    parentTip: "모자란 자리에 0을 채워(1.20) 자릿수를 맞춰 쓰게 해 주세요.",
  },
  {
    id: "DEC_MUL_POINT",
    name: "곱셈에서 소수점 위치를 잘못 찍음",
    childExplain: "소수끼리 곱하면 두 수의 소수점 아래 자리 수를 더한 만큼 소수점 아래 자리가 생겨요. 0.3×0.2는 0.06이에요.",
    parentExplain: "소수의 곱셈에서 곱의 소수점 위치를 잘못 정합니다(0.3×0.2 → 0.6).",
    parentTip: "결과를 어림해서(0.3의 0.2배는 0.3보다 작다) 확인하게 해 주세요.",
  },
  {
    id: "DEC_DIV_IGNORE_POINT",
    name: "소수의 나눗셈에서 소수점을 빠뜨림",
    childExplain: "4.8÷4는 48÷4=12와 같은 방법으로 계산하지만, 몫에도 소수점을 찍어 1.2예요. 4.8을 4로 나누면 12만큼 클 수 없어요.",
    parentExplain: "(소수)÷(자연수)에서 몫에 소수점을 찍지 않습니다(4.8÷4 → 12).",
    parentTip: "나누기 전에 몫이 대략 얼마일지 어림하게 해 주세요.",
  },
  {
    id: "DEC_DIV_POINT",
    name: "소수의 나눗셈에서 몫의 소수점을 잘못 옮김",
    childExplain: "나누는 수와 나누어지는 수의 소수점을 똑같이 옮기면 몫은 그대로예요. 1.2÷0.4는 12÷4와 같아서 3이에요.",
    parentExplain: "(소수)÷(소수)에서 몫의 소수점 위치를 잘못 정합니다(1.2÷0.4 → 0.3).",
    parentTip: "0.4가 1.2 안에 몇 번 들어가는지 더해 보며 확인하게 해 주세요.",
  },
];

const MAP = new Map(MISCONCEPTIONS.map((m) => [m.id, m]));

export function getMisconception(id: string): Misconception {
  const m = MAP.get(id);
  if (!m) throw new Error(`unknown misconception: ${id}`);
  return m;
}

export function isMisconceptionId(id: string): boolean {
  return MAP.has(id);
}
