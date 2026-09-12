import type { Course, RecommendResponse } from "@oneureodi/shared";

const TRANSPORT_LABEL = { walk: "도보", transit: "대중교통", car: "자차" } as const;

/** 카톡·메모에 붙여 넣을 수 있는 순수 텍스트. 링크나 서식 없이 읽히게. */
export function formatCourseText(course: Course, meta: RecommendResponse["meta"]): string {
  const lines: string[] = [];
  lines.push(`[오늘 어디?] ${meta.anchor.name} 근처 · ${course.title}`);
  lines.push(course.reason);
  lines.push("");
  course.stops.forEach((s, i) => {
    const m = s.mentionCounts;
    const src = [m.blog > 0 ? `블로그 ${m.blog}` : null, m.instagram > 0 ? `인스타 ${m.instagram}` : null].filter(Boolean).join(" · ");
    const bits = [s.category?.split(">").pop()?.trim(), s.priceHintKrw !== null ? `1인 약 ${s.priceHintKrw.toLocaleString("ko-KR")}원` : null, src || null].filter(Boolean).join(" · ");
    lines.push(`${i + 1}. ${s.arrivalTime ? `${s.arrivalTime} ` : ""}${s.name}${bits ? ` (${bits})` : ""}`);
    if (s.hint) lines.push(`   ${s.hint}`);
    if (s.parkingLot) lines.push(`   주차: ${s.parkingLot.name} ${s.parkingLot.distanceM}m`);
    if (s.address) lines.push(`   ${s.address}`);
    const leg = course.legs[i];
    if (leg) {
      const how = leg.steps.map((st) => st.text).join(" → ") || TRANSPORT_LABEL[leg.mode];
      lines.push(`   ↓ ${how} · ${leg.durationMin}분${leg.fareKrw !== null ? ` · ${leg.fareKrw.toLocaleString("ko-KR")}원` : ""}`);
    }
  });
  lines.push("");
  lines.push(`${course.startTime} → ${course.endTime} · ${TRANSPORT_LABEL[course.transport]} · 이동 ${course.totalTravelMin}분 · 둘이 약 ${course.knownTotalKrw.toLocaleString("ko-KR")}원${course.hasUnknownPrice ? " +α" : ""}`);
  return lines.join("\n");
}
