import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { RecommendRequest } from "@oneureodi/shared";
import { MAX_COURSES } from "@oneureodi/shared";
import type { Candidate } from "../recommend/candidate";
import { describeWindow, windowFor } from "../recommend/schedule";
import { LlmClient } from "./llm-client";
import { LlmModels } from "./llm-models";

const ComposedCourseSchema = z.object({
  title: z.string(),
  reason: z.string(),
  /** 방문 순서대로. 후보 목록의 id 만 쓴다. */
  stopPlaceIds: z.array(z.string()),
});

const CompositionSchema = z.object({
  courses: z.array(ComposedCourseSchema),
});

export type ComposedCourse = z.infer<typeof ComposedCourseSchema>;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const SYSTEM = `너는 데이트 코스 플래너다. 주어진 후보 장소 목록 안에서만 골라 코스를 짠다.
규칙:
- 코스는 최대 ${MAX_COURSES}개. 조건에 맞는 코스가 그보다 적으면 적게, 없으면 빈 배열.
- 각 코스는 방문 순서대로 2~4곳. 식사·카페·활동(전시·산책·체험)이 섞이면 좋다. 같은 장소를 두 코스 이상에 겹쳐 쓰지 않도록 노력한다.
- 언급 수가 많은 장소(블로그·인스타그램에 자주 나온 곳)를 우선 고른다. 코스마다 언급 있는 장소를 최소 한 곳은 넣는다. 언급이 0인 장소는 카테고리를 채우는 데만 쓴다.
- 코스끼리 분위기가 서로 다르게. 같은 요청에 매번 똑같은 조합이 나오지 않게 다양성을 우선한다.
- 성향: 외향 커플은 활기 있고 사람 많은 곳·체험을, 내향 커플은 조용하고 한적한 곳을. 액티비티를 좋아하면 몸을 쓰는 활동을 하나 넣고, 싫어하면 앉아서 즐기는 곳 위주로.
- 예산: 가격이 알려진 장소의 1인 가격 합 × 2 가 예산을 넘지 않게. 가격 미상 장소는 합산하지 않되 값이 비싸 보이는 곳을 무리하게 넣지 않는다.
- 시간표를 지킨다. 만나는 시각에 첫 장소에 도착하고, 장소마다 "머무는 시간"만큼 있다가 다음 장소로 이동한다(이동은 약 15분). 각 장소에는 "가능 시간대" 안에 도착해야 한다. 예: 13:00 약속이면 와인바(17:00~)는 세 번째 이후에나 가능하고, 첫 장소로는 안 된다. 20:00 약속이면 미술관(~18:00)은 넣지 않는다.
- 저녁 약속이면 식사를 먼저, 낮 약속이면 카페·전시·산책을 먼저 두는 식으로 시간 흐름이 자연스럽게.
- reason 은 왜 이 커플에게 이 코스인지 한두 문장. title 은 15자 이내.
- 후보에 없는 id 를 만들지 않는다.`;

@Injectable()
export class CourseComposer {
  constructor(
    private readonly llm: LlmClient,
    private readonly models: LlmModels,
  ) {}

  async compose(req: RecommendRequest, candidates: readonly Candidate[]): Promise<ComposedCourse[]> {
    const user = [
      `조건:`,
      `- 만나는 곳: ${req.location}`,
      `- 성향: ${req.traits.social === "extrovert" ? "외향적" : "내향적"}, 액티비티 ${req.traits.activity === "like" ? "좋아함" : "안 좋아함"}`,
      `- 예산(2인 합산, 코스 전체): ${req.budgetKrw.toLocaleString("ko-KR")}원`,
      `- 차: ${req.hasCar ? "있음" : "없음 (대중교통·도보)"}`,
      `- 만나는 시간: ${WEEKDAYS[req.meetAt.weekday]}요일 ${req.meetAt.time}`,
      ...(req.excludePlaceIds.length > 0 ? [`- 이 사용자는 이미 코스를 몇 개 봤고 "다른 코스"를 원한다. 후보에 없는 장소는 만들지 말고, 후보 안에서 새로운 조합을 짠다.`] : []),
      ``,
      `후보 장소 (id | 이름 | 카테고리 | 가능 시간대 · 머무는 시간 | 언급 [블로그/인스타/웹] | 1인 가격 | 주차 | 힌트):`,
      ...candidates.map(formatCandidate),
    ].join("\n");

    const result = await this.llm.generateJson({
      model: this.models.compose,
      system: SYSTEM,
      user,
      schema: CompositionSchema,
      name: "date_courses",
    });
    return result.courses;
  }
}

function formatCandidate(c: Candidate): string {
  const price = c.priceHintKrw === null ? "가격미상" : `약 ${c.priceHintKrw.toLocaleString("ko-KR")}원`;
  const hint = c.hints.length > 0 ? c.hints.slice(0, 2).join(" / ") : "-";
  const m = c.mentionCounts;
  const w = windowFor(c.category, c.name);
  return `${c.id} | ${c.name} | ${c.category ?? "-"} | ${describeWindow(w)} · ${w.stayMin}분 | ${m.blog}/${m.instagram}/${m.web} | ${price} | ${c.parking} | ${hint}`;
}
