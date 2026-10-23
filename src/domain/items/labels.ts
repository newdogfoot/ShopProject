/**
 * Words used as answers to "which kind?" questions (angles, triangles, how
 * likely). Generators and the independent checks share these exact strings.
 */
export const ANGLE_KIND = { acute: "예각", right: "직각", obtuse: "둔각" } as const;
export const TRIANGLE_BY_ANGLES = { acute: "예각삼각형", right: "직각삼각형", obtuse: "둔각삼각형" } as const;
export const TRIANGLE_BY_SIDES = { equilateral: "정삼각형", isosceles: "이등변삼각형", scalene: "세 변의 길이가 모두 다른 삼각형" } as const;
/** How likely something is, from impossible to certain (5학년 2학기 가능성). */
export const LIKELIHOOD = ["불가능하다", "~아닐 것 같다", "반반이다", "~일 것 같다", "확실하다"] as const;
