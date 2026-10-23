/** Clock hands and a spoken description of where they point. */
import { withJosa } from "../math/korean";

/** Hand angles in degrees, clockwise from 12. The hour hand moves with the minutes. */
export function clockHands(hour: number, minute: number): { hour: number; minute: number } {
  return { hour: ((hour % 12) * 30 + minute * 0.5) % 360, minute: (minute * 6) % 360 };
}

/** "짧은바늘은 3과 4 사이, 긴바늘은 5를 가리키는 시계" (describes the hands without giving the time). */
export function describeClock(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const short = minute === 0 ? String(h) : `${withJosa(h, "과/와")} ${(h % 12) + 1} 사이`;
  const mark = Math.floor(minute / 5) === 0 ? 12 : Math.floor(minute / 5);
  const extra = minute % 5;
  const long = extra === 0 ? String(mark) : `${mark}에서 작은 눈금 ${extra}칸 더 간 곳`;
  return `짧은바늘은 ${short}, 긴바늘은 ${withJosa(long, "을/를")} 가리키는 시계`;
}
