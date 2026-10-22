/**
 * Exact rational numbers for grading and generating fraction/decimal items.
 * Floating point is never used for answers (0.1 + 0.2 must equal 0.3).
 * Values stay small in elementary math, so plain safe integers are enough.
 */
export interface Rational {
  readonly n: number;
  readonly d: number;
}

function assertSafeInt(x: number, label: string): void {
  if (!Number.isSafeInteger(x)) {
    throw new RangeError(`${label} must be a safe integer, got ${x}`);
  }
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

/** Builds a normalized rational: denominator positive, fraction in lowest terms. */
export function rat(n: number, d = 1): Rational {
  assertSafeInt(n, "numerator");
  assertSafeInt(d, "denominator");
  if (d === 0) throw new RangeError("denominator must not be 0");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

export const ZERO = rat(0);
export const ONE = rat(1);

export function isRational(x: unknown): x is Rational {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Rational).n === "number" &&
    typeof (x as Rational).d === "number"
  );
}

export function toRational(x: number | Rational): Rational {
  return typeof x === "number" ? rat(x) : x;
}

export function add(a: Rational, b: Rational): Rational {
  const g = gcd(a.d, b.d);
  return rat(a.n * (b.d / g) + b.n * (a.d / g), (a.d / g) * b.d);
}

export function sub(a: Rational, b: Rational): Rational {
  return add(a, { n: -b.n, d: b.d });
}

export function mul(a: Rational, b: Rational): Rational {
  const g1 = gcd(a.n, b.d) || 1;
  const g2 = gcd(b.n, a.d) || 1;
  return rat((a.n / g1) * (b.n / g2), (a.d / g2) * (b.d / g1));
}

export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new RangeError("division by zero");
  return mul(a, { n: b.d, d: b.n });
}

export function cmp(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function eq(a: Rational, b: Rational): boolean {
  return a.n === b.n && a.d === b.d;
}

export function isInt(a: Rational): boolean {
  return a.d === 1;
}

/** Splits a non-negative rational into a whole part and a proper fraction. */
export function toMixed(a: Rational): { whole: number; n: number; d: number } {
  if (a.n < 0) throw new RangeError("toMixed expects a non-negative value");
  return { whole: Math.floor(a.n / a.d), n: a.n % a.d, d: a.d };
}

/** Number of digits after the decimal point when written as a terminating decimal, or null. */
export function decimalPlaces(a: Rational): number | null {
  let d = a.d;
  let twos = 0;
  let fives = 0;
  while (d % 2 === 0) {
    d /= 2;
    twos++;
  }
  while (d % 5 === 0) {
    d /= 5;
    fives++;
  }
  if (d !== 1) return null;
  return Math.max(twos, fives);
}

/** Parses "12", "0.25", "3.40". Returns null for anything else. */
export function fromDecimalString(text: string): Rational | null {
  const s = text.trim();
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const intPart = m[1];
  const frac = m[2] ?? "";
  const digits = intPart + frac;
  if (digits.length > 15) return null;
  return rat(Number(digits), 10 ** frac.length);
}

/** Formats a terminating rational as a decimal string ("0.25", "3"), or null if it does not terminate. */
export function toDecimalString(a: Rational): string | null {
  const places = decimalPlaces(a);
  if (places === null) return null;
  const negative = a.n < 0;
  const scaled = (Math.abs(a.n) * 10 ** places) / a.d;
  let digits = String(Math.round(scaled));
  if (places === 0) return (negative ? "-" : "") + digits;
  digits = digits.padStart(places + 1, "0");
  const intPart = digits.slice(0, digits.length - places);
  const fracPart = digits.slice(digits.length - places);
  return (negative ? "-" : "") + intPart + "." + fracPart;
}

/** Decimal number from integer digits and a number of decimal places: dec(125, 2) = 1.25. */
export function dec(digits: number, places: number): Rational {
  return rat(digits, 10 ** places);
}

/**
 * Math markup for a rational value.
 * - "fraction": {7/3}
 * - "mixed": {2 1/3} (whole numbers stay plain)
 * - "decimal": 2.5
 */
export function formatRational(a: Rational, style: "fraction" | "mixed" | "decimal" = "mixed"): string {
  if (style === "decimal") {
    const s = toDecimalString(a);
    if (s !== null) return s;
    style = "mixed";
  }
  if (a.d === 1) return String(a.n);
  if (style === "fraction" || a.n < a.d) return `{${a.n}/${a.d}}`;
  const m = toMixed(a);
  return m.n === 0 ? String(m.whole) : `{${m.whole} ${m.n}/${m.d}}`;
}
