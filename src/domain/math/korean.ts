/**
 * Korean number reading and particle (조사) helpers, so generated sentences read
 * naturally: "8을 빼요", "2를 빼요", "13은", "10과".
 */

const DIGITS = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const SMALL_UNITS = ["", "십", "백", "천"];
const BIG_UNITS = ["", "만", "억", "조", "경"];

function readGroup(g: number): string {
  let out = "";
  const digits = String(g).padStart(4, "0").split("").map(Number);
  digits.forEach((d, i) => {
    const pos = 3 - i;
    if (d === 0) return;
    if (d === 1 && pos > 0) out += SMALL_UNITS[pos];
    else out += DIGITS[d] + SMALL_UNITS[pos];
  });
  return out;
}

/**
 * Sino-Korean reading of a non-negative integer, spaced by 만 units as in
 * textbooks: 34500 → "삼만 사천오백", 305 → "삼백오", 10000 → "만".
 */
export function readNumberKo(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`cannot read ${n}`);
  if (n === 0) return DIGITS[0];
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 10000);
    rest = Math.floor(rest / 10000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const big = BIG_UNITS[i];
    // 10000 is read 만 (not 일만); 1억 and 1조 keep 일.
    const text = g === 1 && i === 1 ? "" : readGroup(g);
    parts.push(text + big);
  }
  return parts.join(" ");
}

/** Parses a Sino-Korean number ("삼만 사천오백" → 34500). Independent of readNumberKo, used in tests. */
export function parseKoreanNumber(text: string): number | null {
  const s = text.replace(/\s+/g, "");
  if (s === "영") return 0;
  const digitValue: Record<string, number> = {
    일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
  };
  const small: Record<string, number> = { 십: 10, 백: 100, 천: 1000 };
  const big: Record<string, number> = { 만: 1e4, 억: 1e8, 조: 1e12, 경: 1e16 };
  let total = 0;
  let section = 0;
  let current = 0;
  for (const ch of s) {
    if (ch in digitValue) {
      current = digitValue[ch];
    } else if (ch in small) {
      section += (current || 1) * small[ch];
      current = 0;
    } else if (ch in big) {
      section += current;
      total += (section || 1) * big[ch];
      section = 0;
      current = 0;
    } else {
      return null;
    }
  }
  return total + section + current;
}

/** Reads a decimal string the way it is spoken: "0.25" → "영 점 이오". */
export function readDecimalKo(text: string): string {
  const [i, f] = text.split(".");
  const intText = readNumberKo(Number(i));
  if (!f) return intText;
  return `${intText} 점 ${f.split("").map((c) => DIGITS[Number(c)]).join("")}`;
}

/** Reads a fraction: (3, 4) → "4분의 3"; with whole 1 → "1과 4분의 3". */
export function readFractionKo(n: number, d: number, whole?: number): string {
  const frac = `${readNumberKo(d)}분의 ${readNumberKo(n)}`;
  if (!whole) return frac;
  return `${readNumberKo(whole)}과 ${frac}`;
}

const UNIT_READINGS: Record<string, string> = {
  L: "리터",
  mL: "밀리리터",
  kg: "킬로그램",
  g: "그램",
  km: "킬로미터",
  m: "미터",
  cm: "센티미터",
  mm: "밀리미터",
};

/** Final syllable used to choose a particle for the given word or value. */
function lastSyllable(word: string | number): string {
  if (typeof word === "number") {
    return lastChar(Number.isInteger(word) ? readNumberKo(word) : readDecimalKo(String(word)));
  }
  const s = word.trim();
  // Fraction markup {3/4} or {1 3/4}: the numerator is read last ("4분의 3").
  const frac = /\{(?:\d+\s+)?(\d+)\/(\d+)\}$/.exec(s);
  if (frac) return lastChar(readNumberKo(Number(frac[1])));
  const unit = /(mL|kg|km|cm|mm|L|g|m)$/.exec(s);
  if (unit && !/[가-힣]$/.test(s)) return lastChar(UNIT_READINGS[unit[1]]);
  const num = /(\d[\d,]*)(?:\.(\d+))?$/.exec(s);
  if (num) {
    if (num[2]) return DIGITS[Number(num[2].slice(-1))];
    return lastChar(readNumberKo(Number(num[1].replace(/,/g, ""))));
  }
  const ch = lastChar(s);
  return ch ?? "";
}

function lastChar(s: string): string {
  return s.slice(-1);
}

/** 0 = no final consonant, 8 = ㄹ, other = some final consonant; -1 if not Hangul. */
function finalConsonant(syllable: string): number {
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return -1;
  return (code - 0xac00) % 28;
}

export type JosaPair = "을/를" | "이/가" | "은/는" | "과/와" | "으로/로" | "이에요/예요" | "이나/나" | "이랑/랑";

/** Particle only: josa(8, "을/를") → "을", josa(2, "을/를") → "를". */
export function josa(word: string | number, pair: JosaPair): string {
  const [withBatchim, without] = pair.split("/");
  const fc = finalConsonant(lastSyllable(word));
  if (fc <= 0) return without;
  if (pair === "으로/로" && fc === 8) return without;
  return withBatchim;
}

/** Word followed by its particle: withJosa(13, "은/는") → "13은". */
export function withJosa(word: string | number, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}

/** Thousands separators as in Korean textbooks: 34500 → "34,500" (only for 5+ digits). */
export function formatInt(n: number): string {
  return Math.abs(n) >= 10000 ? n.toLocaleString("en-US") : String(n);
}
