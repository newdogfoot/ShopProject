/**
 * Writes docs/02-concept-map.md from the concept map in code
 * (src/domain/curriculum/skills.ts), so the document never drifts from the data.
 *
 *   npm run docs:concept-map
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { SKILLS, STRANDS, getSkill, skillsInStrand } from "../src/domain/curriculum/skills";
import { topologicalOrder } from "../src/domain/curriculum/graph";
import { MISCONCEPTIONS } from "../src/domain/items/misconceptions";

const order = topologicalOrder();
const byOrder = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
const misconceptionName = new Map(MISCONCEPTIONS.map((m) => [m.id, m.name]));
const term = (s: { grade: number; semester: number }) => `${s.grade}-${s.semester}`;
const cell = (text: string) => text.replace(/\|/g, "\\|");

const lines: string[] = [];
const out = (line = "") => lines.push(line);

out("# 개념 지도: 수와 연산 (1~6학년)");
out();
out("> 이 문서는 `npm run docs:concept-map`이 코드(`src/domain/curriculum/skills.ts`)에서 만듭니다. 직접 고치지 말고 코드를 고친 뒤 다시 만드세요.");
out();
out(`- 개념 ${SKILLS.length}개, 계열 ${STRANDS.length}개, 대표 오개념 ${MISCONCEPTIONS.length}개`);
out("- **선수 개념**은 실제 학습 의존 관계만 적습니다(교과서 순서만으로는 연결하지 않음). 진단은 이 연결을 따라 숙달·결손을 추론합니다.");
out("- **학년-학기**는 교과서의 대표 배치입니다. 3~6학년은 검정 교과서라 출판사마다 단원 순서가 조금 다를 수 있습니다.");
out("- **성취기준**은 학년군과 영역(`[2수01-…]`, `[4수01-…]`, `[6수01-…]`)까지만 적었습니다. 정확한 번호는 2022 개정 교육과정 원문과 대조해 채워야 합니다(원문 PDF 주소가 이 작업 환경의 네트워크 정책으로 막혀 확인하지 못함).");
out();

out("## 한눈에 보기");
out();
out("화살표는 '먼저 알아야 하는 개념 → 다음 개념'입니다.");
out();
out("```mermaid");
out("flowchart LR");
for (const strand of STRANDS) {
  out(`  subgraph ${strand.id}["${strand.name}"]`);
  for (const s of byOrder(skillsInStrand(strand.id))) out(`    ${s.id}["${s.name}<br/>${term(s)}"]`);
  out("  end");
}
for (const s of byOrder([...SKILLS])) for (const p of s.prerequisites) out(`  ${p} --> ${s.id}`);
out("```");
out();

for (const strand of STRANDS) {
  out(`## ${strand.emoji} ${strand.name}`);
  out();
  out("| 학년-학기 | 개념 | 학습 목표 | 선수 개념 | 잡아내는 오개념 | 문장제 | 성취기준 |");
  out("|---|---|---|---|---|---|---|");
  for (const s of byOrder(skillsInStrand(strand.id))) {
    const prereq = s.prerequisites.map((p) => getSkill(p).name).join(", ") || "–";
    const mis = s.misconceptions.map((m) => misconceptionName.get(m) ?? m).join(", ") || "–";
    out(`| ${term(s)} | **${cell(s.name)}**<br/>\`${s.id}\` | ${cell(s.goal)} | ${cell(prereq)} | ${cell(mis)} | ${s.wordProblems ? "○" : "–"} | ${s.standardArea} |`);
  }
  out();
}

out("## 대표 오개념");
out();
out("문항 생성기가 각 오개념이 만드는 오답을 미리 계산해 두므로, 아이의 답이 그 오답과 같으면 코드가 바로 오개념으로 판정합니다.");
out();
out("| 오개념 | 보호자용 설명 | 집에서 도와주기 | 관련 개념 |");
out("|---|---|---|---|");
for (const m of MISCONCEPTIONS) {
  const skills = SKILLS.filter((s) => (s.misconceptions as readonly string[]).includes(m.id)).map((s) => s.name);
  out(`| **${cell(m.name)}**<br/>\`${m.id}\` | ${cell(m.parentExplain)} | ${cell(m.parentTip)} | ${cell(skills.join(", ") || "–")} |`);
}
out();

const target = path.join(process.cwd(), "docs", "02-concept-map.md");
writeFileSync(target, lines.join("\n"));
console.log(`wrote ${path.relative(process.cwd(), target)} (${SKILLS.length} skills, ${MISCONCEPTIONS.length} misconceptions)`);
