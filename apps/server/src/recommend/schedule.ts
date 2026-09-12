import type { MeetAt } from "@oneureodi/shared";

/**
 * 영업시간 데이터가 없어서(카카오 API 미제공) 카테고리로 "열려 있을 법한 시간대"를 정한다.
 * 실제 영업시간이 아니라 규칙이므로 화면에는 "예상"으로 표시한다.
 */
export interface TimeWindow {
  /** 분 단위 (0 = 00:00). close 가 open 보다 작으면 자정을 넘긴다 */
  openMin: number;
  closeMin: number;
  /** 보통 머무는 시간(분) */
  stayMin: number;
  /** 정기 휴무 요일 (0 = 일). 미술관·박물관은 월요일 */
  closedWeekdays: number[];
  label: string;
}

const H = (h: number, m = 0) => h * 60 + m;

interface Rule {
  test: RegExp;
  window: TimeWindow;
  /** 상호에도 적용할지. "서울숲"처럼 이름에 흔한 말은 카테고리에만 쓴다 */
  nameToo?: boolean;
}

/** 위에서부터 첫 매칭. 구체적인 것(브런치, 와인바)이 일반적인 것(카페, 음식점)보다 먼저. */
const RULES: Rule[] = [
  { test: /클럽|나이트/, window: { openMin: H(21), closeMin: H(4), stayMin: 120, closedWeekdays: [], label: "클럽" }, nameToo: true },
  { test: /와인|바\b|칵테일|펍|호프|맥주|이자카야|포차|술집|주점|요리주점|위스키|막걸리/, window: { openMin: H(17), closeMin: H(2), stayMin: 90, closedWeekdays: [], label: "술집" }, nameToo: true },
  { test: /브런치/, window: { openMin: H(9), closeMin: H(15), stayMin: 70, closedWeekdays: [], label: "브런치" }, nameToo: true },
  { test: /영화|시네마|극장/, window: { openMin: H(10), closeMin: H(24), stayMin: 130, closedWeekdays: [], label: "영화" } },
  { test: /만화|보드|방탈출|노래|PC방|볼링|당구|오락|게임|VR|사격|다트/, window: { openMin: H(10), closeMin: H(24), stayMin: 90, closedWeekdays: [], label: "실내 놀이" } },
  { test: /미술관|박물관|전시|갤러리|기념관/, window: { openMin: H(10), closeMin: H(18), stayMin: 80, closedWeekdays: [1], label: "전시" } },
  { test: /문화시설|공연|극단|서점|도서관/, window: { openMin: H(10), closeMin: H(20), stayMin: 70, closedWeekdays: [], label: "문화" } },
  { test: /공원|숲|산책|둘레길|한강|강변|명소|거리|시장|전망/, window: { openMin: H(7), closeMin: H(21), stayMin: 50, closedWeekdays: [], label: "야외" } },
  { test: /체험|공방|클래스|원데이|스튜디오|사진/, window: { openMin: H(10), closeMin: H(20), stayMin: 90, closedWeekdays: [], label: "체험" } },
  { test: /카페|커피|디저트|베이커리|빵|케이크|차\b|티룸/, window: { openMin: H(9), closeMin: H(22), stayMin: 60, closedWeekdays: [], label: "카페" } },
  { test: /음식점|식당|한식|일식|양식|중식|분식|고기|치킨|피자|파스타|초밥|국수|우동|카레|버거|돈까스|뷔페|아시아|멕시칸|인도/, window: { openMin: H(11), closeMin: H(22), stayMin: 70, closedWeekdays: [], label: "식사" } },
  { test: /쇼핑|편집숍|스토어|마켓|백화점|몰/, window: { openMin: H(10), closeMin: H(21), stayMin: 50, closedWeekdays: [], label: "쇼핑" } },
];

const DEFAULT_WINDOW: TimeWindow = { openMin: H(10), closeMin: H(22), stayMin: 60, closedWeekdays: [], label: "기타" };

export function windowFor(category: string | null, name = ""): TimeWindow {
  // 확실한 단어(와인바·브런치·클럽)는 상호에서도 찾고, 나머지는 카테고리만 본다.
  for (const rule of RULES) if (rule.nameToo && rule.test.test(name)) return rule.window;
  const cat = category ?? "";
  for (const rule of RULES) if (rule.test.test(cat)) return rule.window;
  return DEFAULT_WINDOW;
}

/** "HH:mm" → 분 */
export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 분 → "HH:mm". 하루를 넘기면 24 를 뺀다 (01:30) */
export function formatTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 자정 넘김을 고려한 "이 시각에 열려 있나". 도착이 문 닫기 LEAD 분 전이면 열린 걸로 본다. */
const CLOSE_LEAD_MIN = 60;
export function isOpenAt(w: TimeWindow, atMin: number, weekday: number): boolean {
  if (w.closedWeekdays.includes(weekday)) return false;
  const t = ((atMin % 1440) + 1440) % 1440;
  const lastEntry = w.closeMin - CLOSE_LEAD_MIN;
  if (w.closeMin > w.openMin) return t >= w.openMin && t <= lastEntry;
  // 자정을 넘기는 곳: 17:00~02:00 → 17:00 이후이거나 01:00 이전
  return t >= w.openMin || t <= ((lastEntry % 1440) + 1440) % 1440;
}

export interface ScheduledStop {
  arrivalMin: number;
  arrivalTime: string;
  stayMin: number;
  window: TimeWindow;
  ok: boolean;
}

/**
 * 만나는 시각부터 순서대로 도착 시각을 낸다. legMinutes[i] 는 i 번째 → i+1 번째 이동 시간.
 * 이동 시간을 아직 모르면 어림값을 넣는다.
 */
export function scheduleStops(
  stops: readonly { category: string | null; name: string }[],
  legMinutes: readonly number[],
  meetAt: MeetAt,
): { stops: ScheduledStop[]; endMin: number; endTime: string; allOpen: boolean } {
  let cursor = parseTime(meetAt.time);
  const out: ScheduledStop[] = [];
  stops.forEach((s, i) => {
    const w = windowFor(s.category, s.name);
    const ok = isOpenAt(w, cursor, meetAt.weekday);
    out.push({ arrivalMin: cursor, arrivalTime: formatTime(cursor), stayMin: w.stayMin, window: w, ok });
    cursor += w.stayMin + (legMinutes[i] ?? 0);
  });
  return { stops: out, endMin: cursor, endTime: formatTime(cursor), allOpen: out.every((s) => s.ok) };
}

/** 데이트 시간 폭. 만나는 시각부터 이 안에 열리는 곳만 후보로 둔다. */
export const DATE_SPAN_MIN = 6 * 60;

/** 만나는 시각부터 6시간 안에 한 번이라도 열려 있으면 후보로 남긴다. 13시 약속에 와인바는 남고(17시), 클럽은 빠진다(21시). */
export function fitsDate(w: TimeWindow, meetAt: MeetAt): boolean {
  const start = parseTime(meetAt.time);
  for (let t = start; t <= start + DATE_SPAN_MIN; t += 30) if (isOpenAt(w, t, meetAt.weekday)) return true;
  return false;
}

export function describeWindow(w: TimeWindow): string {
  return `${formatTime(w.openMin)}~${formatTime(w.closeMin)}${w.closedWeekdays.includes(1) ? " 월휴무" : ""}`;
}
