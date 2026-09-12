import { z } from "zod";

// ---------- 입력 ----------

export const SocialTrait = z.enum(["extrovert", "introvert"]);
export const ActivityTrait = z.enum(["like", "dislike"]);

export const TraitsSchema = z.object({
  social: SocialTrait,
  activity: ActivityTrait,
});

/** 0 = 일요일 … 6 = 토요일 (JS Date.getDay 와 동일) */
export const WeekdaySchema = z.number().int().min(0).max(6);

export const MeetAtSchema = z.object({
  weekday: WeekdaySchema,
  /** "HH:mm" 24시간제 */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm 형식이어야 합니다"),
});

export const RecommendRequestSchema = z.object({
  /** 지역명 또는 역 이름. 예: "성수동", "홍대입구역" */
  location: z.string().trim().min(1).max(50),
  traits: TraitsSchema,
  /** 2인 합산, 코스 전체 예산 (원) */
  budgetKrw: z.number().int().min(0).max(10_000_000),
  hasCar: z.boolean(),
  meetAt: MeetAtSchema,
  /** "다른 코스 더 보기": 이미 보여준 장소 id. 후보가 충분하면 이 장소들은 빼고 짠다 */
  excludePlaceIds: z.array(z.string()).max(200).default([]),
});

export type Traits = z.infer<typeof TraitsSchema>;
export type MeetAt = z.infer<typeof MeetAtSchema>;
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

// ---------- 결과 ----------

export const ParkingSchema = z.enum(["yes", "no", "unknown"]);
export type Parking = z.infer<typeof ParkingSchema>;

export const TransportSchema = z.enum(["walk", "transit", "car"]);
export type Transport = z.infer<typeof TransportSchema>;

/** 웹 언급의 출처 종류 */
export const SourceKindSchema = z.enum(["blog", "instagram", "web"]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const MentionCountsSchema = z.object({ blog: z.number().int(), instagram: z.number().int(), web: z.number().int() });
export type MentionCounts = z.infer<typeof MentionCountsSchema>;

export const ParkingLotSchema = z.object({
  name: z.string(),
  /** 장소에서 주차장까지 직선거리(m) */
  distanceM: z.number().int(),
  address: z.string().nullable(),
});
export type ParkingLot = z.infer<typeof ParkingLotSchema>;

export const RouteStepSchema = z.object({
  kind: z.enum(["walk", "bus", "subway", "car"]),
  /** 사람이 읽는 한 줄. 예: "2016번 버스 3정거장 (뚝섬역8번출구 → 성수역4번출구)" */
  text: z.string(),
  durationMin: z.number().int(),
  distanceM: z.number().int(),
});
export type RouteStep = z.infer<typeof RouteStepSchema>;

/** 장소 사이 이동 한 구간 */
export const LegSchema = z.object({
  fromPlaceId: z.string(),
  toPlaceId: z.string(),
  mode: z.enum(["walk", "transit", "car"]),
  distanceM: z.number().int(),
  durationMin: z.number().int(),
  steps: z.array(RouteStepSchema),
  /** 대중교통 요금(원). 모르면 null */
  fareKrw: z.number().int().nullable(),
  /** 카카오맵에서 이 경로를 여는 링크. 없으면 null */
  mapUrl: z.string().nullable(),
  /** true 면 API 가 아니라 직선거리로 어림한 값 */
  estimated: z.boolean(),
});
export type Leg = z.infer<typeof LegSchema>;

export const CourseStopSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  address: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  url: z.string().nullable(),
  parking: ParkingSchema,
  /** 1인 예상 지출(원). 모르면 null → 총합에서 제외되고 "+α" 로 표시된다 */
  priceHintKrw: z.number().int().nullable(),
  /** 웹 글에서 뽑은 한 줄 힌트 */
  hint: z.string().nullable(),
  /** 이 장소를 언급한 웹 글 수 */
  mentionCount: z.number().int(),
  /** 출처 종류별 글 수. 합은 mentionCount */
  mentionCounts: MentionCountsSchema,
  /** 차 있을 때만 채운다. 300m 안 가장 가까운 주차장. 없으면 null */
  parkingLot: ParkingLotSchema.nullable(),
  /** 만나는 시각부터 계산한 도착 시각 "HH:mm" */
  arrivalTime: z.string(),
  /** 여기서 보내는 시간(분). 카테고리 기준 어림 */
  stayMin: z.number().int(),
  /** 카테고리로 정한 예상 영업 시간대. 예: "17:00~02:00". 실제 영업시간이 아니다 */
  openLabel: z.string(),
});
export type CourseStop = z.infer<typeof CourseStopSchema>;

export const CourseSchema = z.object({
  title: z.string(),
  /** 왜 이 코스인가 — 간략 */
  reason: z.string(),
  transport: TransportSchema,
  stops: z.array(CourseStopSchema).min(1),
  /** 장소 사이 이동. 길이는 stops - 1 */
  legs: z.array(LegSchema),
  /** 이동 시간 합(분) */
  totalTravelMin: z.number().int(),
  /** 첫 장소 도착(= 만나는 시각)과 마지막 장소를 나오는 시각 "HH:mm" */
  startTime: z.string(),
  endTime: z.string(),
  /** 가격이 알려진 장소만 합산한 2인 총액(원) */
  knownTotalKrw: z.number().int(),
  /** 가격을 모르는 장소가 하나라도 있으면 true → 화면에 "+α" */
  hasUnknownPrice: z.boolean(),
});
export type Course = z.infer<typeof CourseSchema>;

export const RecommendResponseSchema = z.object({
  /** 최대 5개. 0개일 수 있다 */
  courses: z.array(CourseSchema).max(5),
  /** 진단용 */
  meta: z.object({
    anchor: z.object({ name: z.string(), lat: z.number(), lng: z.number() }),
    radiusM: z.number().int(),
    candidateCount: z.number().int(),
    fromCache: z.boolean(),
    elapsedMs: z.number().int(),
  }),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

export const MAX_COURSES = 5;
