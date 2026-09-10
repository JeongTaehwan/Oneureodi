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
});

export type Traits = z.infer<typeof TraitsSchema>;
export type MeetAt = z.infer<typeof MeetAtSchema>;
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

// ---------- 결과 ----------

export const ParkingSchema = z.enum(["yes", "no", "unknown"]);
export type Parking = z.infer<typeof ParkingSchema>;

export const TransportSchema = z.enum(["walk", "transit", "car"]);
export type Transport = z.infer<typeof TransportSchema>;

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
});
export type CourseStop = z.infer<typeof CourseStopSchema>;

export const CourseSchema = z.object({
  title: z.string(),
  /** 왜 이 코스인가 — 간략 */
  reason: z.string(),
  transport: TransportSchema,
  stops: z.array(CourseStopSchema).min(1),
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
