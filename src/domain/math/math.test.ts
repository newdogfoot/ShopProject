import { describe, expect, it } from "vitest";
import {
  add,
  cmp,
  decimalPlaces,
  div,
  eq,
  formatRational,
  fromDecimalString,
  gcd,
  lcm,
  mul,
  rat,
  sub,
  toDecimalString,
  toMixed,
} from "./rational";
import { createRng, deriveSeed } from "./rng";
import { josa, parseKoreanNumber, readDecimalKo, readFractionKo, readNumberKo, withJosa } from "./korean";
import { markupToPlain, markupToSpeech, numbersIn, parseMarkup } from "./markup";

describe("rational", () => {
  it("normalizes and does exact arithmetic", () => {
    expect(rat(2, 4)).toEqual({ n: 1, d: 2 });
    expect(rat(3, -6)).toEqual({ n: -1, d: 2 });
    expect(add(rat(1, 2), rat(1, 3))).toEqual(rat(5, 6));
    expect(sub(rat(3, 4), rat(1, 6))).toEqual(rat(7, 12));
    expect(mul(rat(2, 3), rat(3, 4))).toEqual(rat(1, 2));
    expect(div(rat(3, 4), rat(1, 8))).toEqual(rat(6));
    expect(add(fromDecimalString("0.1")!, fromDecimalString("0.2")!)).toEqual(fromDecimalString("0.3"));
  });

  it("compares and converts", () => {
    expect(cmp(rat(1, 3), rat(1, 5))).toBe(1);
    expect(eq(rat(6, 8), rat(3, 4))).toBe(true);
    expect(toMixed(rat(7, 3))).toEqual({ whole: 2, n: 1, d: 3 });
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
  });

  it("handles decimals", () => {
    expect(fromDecimalString("12.50")).toEqual(rat(25, 2));
    expect(fromDecimalString("1.")).toBeNull();
    expect(fromDecimalString("abc")).toBeNull();
    expect(toDecimalString(rat(1, 4))).toBe("0.25");
    expect(toDecimalString(rat(3))).toBe("3");
    expect(toDecimalString(rat(1, 3))).toBeNull();
    expect(toDecimalString(rat(21, 1000))).toBe("0.021");
    expect(decimalPlaces(rat(3, 8))).toBe(3);
  });

  it("formats markup", () => {
    expect(formatRational(rat(7, 3))).toBe("{2 1/3}");
    expect(formatRational(rat(7, 3), "fraction")).toBe("{7/3}");
    expect(formatRational(rat(6, 3))).toBe("2");
    expect(formatRational(rat(5, 2), "decimal")).toBe("2.5");
  });
});

describe("rng", () => {
  it("is deterministic per seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.int(1, 100));
    const seqB = Array.from({ length: 5 }, () => b.int(1, 100));
    expect(seqA).toEqual(seqB);
    expect(deriveSeed(1, "a", 2)).toBe(deriveSeed(1, "a", 2));
    expect(deriveSeed(1, "a", 2)).not.toBe(deriveSeed(1, "a", 3));
  });

  it("stays within bounds", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = r.int(3, 9);
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(9);
    }
  });
});

describe("korean", () => {
  it("reads numbers like the textbook", () => {
    expect(readNumberKo(0)).toBe("영");
    expect(readNumberKo(305)).toBe("삼백오");
    expect(readNumberKo(1111)).toBe("천백십일");
    expect(readNumberKo(10000)).toBe("만");
    expect(readNumberKo(34500)).toBe("삼만 사천오백");
    expect(readNumberKo(100000000)).toBe("일억");
    expect(readNumberKo(2030000005)).toBe("이십억 삼천만 오");
  });

  it("round-trips readings through an independent parser", () => {
    const r = createRng(1);
    for (let i = 0; i < 2000; i++) {
      const n = r.int(0, 10 ** r.int(1, 13));
      expect(parseKoreanNumber(readNumberKo(n))).toBe(n);
    }
  });

  it("reads decimals and fractions", () => {
    expect(readDecimalKo("0.25")).toBe("영 점 이오");
    expect(readFractionKo(3, 4)).toBe("사분의 삼");
    expect(readFractionKo(3, 4, 1)).toBe("일과 사분의 삼");
  });

  it("chooses particles", () => {
    expect(withJosa(8, "을/를")).toBe("8을");
    expect(withJosa(2, "을/를")).toBe("2를");
    expect(withJosa(13, "은/는")).toBe("13은");
    expect(withJosa(10, "과/와")).toBe("10과");
    expect(withJosa(5, "과/와")).toBe("5와");
    expect(withJosa("사과", "을/를")).toBe("사과를");
    expect(withJosa("귤", "이/가")).toBe("귤이");
    expect(withJosa("{3/4}", "은/는")).toBe("{3/4}은");
    expect(withJosa("{1/2}", "은/는")).toBe("{1/2}은");
    expect(withJosa("{2/5}", "은/는")).toBe("{2/5}는");
    expect(josa("연필", "으로/로")).toBe("로");
    expect(josa("책상", "으로/로")).toBe("으로");
    expect(withJosa("3L", "을/를")).toBe("3L를");
    expect(withJosa("2kg", "을/를")).toBe("2kg을");
    expect(withJosa("0.25", "은/는")).toBe("0.25는");
  });
});

describe("markup", () => {
  it("parses fractions", () => {
    expect(parseMarkup("{1 3/4} + {1/4} = □")).toEqual([
      { type: "frac", whole: 1, n: 3, d: 4 },
      { type: "text", text: " + " },
      { type: "frac", whole: undefined, n: 1, d: 4 },
      { type: "text", text: " = □" },
    ]);
    expect(markupToPlain("{1 3/4} + {1/4}")).toBe("1 3/4 + 1/4");
    expect(numbersIn("사탕 1,200개와 {3/4}")).toEqual(["1200", "3", "4"]);
  });

  it("makes speech text", () => {
    expect(markupToSpeech("47 + 38 = □")).toBe("47 더하기 38은 얼마일까요");
    expect(markupToSpeech("{3/4} + {1/4} = □")).toBe("사분의 삼 더하기 사분의 일은 얼마일까요");
    expect(markupToSpeech("52 − 38 = □")).toBe("52 빼기 38은 얼마일까요");
  });
});
