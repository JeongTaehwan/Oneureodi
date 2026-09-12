import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import type { Course, CourseStop, Leg, RecommendResponse, RouteStep } from "@oneureodi/shared";
import { Blob } from "../components/Blob";
import { Card } from "../components/Card";
import { IconCar, IconChevronLeft, IconParking, IconSearchFace, IconShare, IconSubway, IconTransit, IconWalk } from "../components/icons";
import { Txt } from "../components/Txt";
import { formatCourseText } from "../share";
import { colors, radii } from "../theme";

interface Props {
  result: RecommendResponse;
  onBack: () => void;
  onMore: () => void;
  loadingMore: boolean;
  moreError: string | null;
}

const TRANSPORT_LABEL = { walk: "도보", transit: "대중교통", car: "자차" } as const;
const PARKING_LABEL = { yes: "주차 가능", no: "주차 불가", unknown: "주차 정보 없음" } as const;

export function ResultScreen({ result, onBack, onMore, loadingMore, moreError }: Props) {
  const empty = result.courses.length === 0;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.container, empty && styles.containerEmpty]}>
      <Blob size={130} style={{ top: 20, right: -40 }} />
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <IconChevronLeft />
        <Txt style={styles.backLabel}>조건 다시 넣기</Txt>
      </Pressable>
      <View style={styles.header}>
        <Txt style={styles.title}>{result.meta.anchor.name} 근처</Txt>
        <Txt style={styles.meta}>
          후보 {result.meta.candidateCount}곳 · {result.meta.fromCache ? "모아둔 정보" : "방금 조사"} · {(result.meta.elapsedMs / 1000).toFixed(1)}초
        </Txt>
      </View>

      {empty ? (
        <View style={styles.emptyWrap}>
          <Card style={styles.emptyCard}>
            <View style={styles.emptyArt}>
              <View style={styles.emptyBlobBig} />
              <View style={styles.emptyBlobSmall} />
              <IconSearchFace />
            </View>
            <Txt style={styles.emptyTitle}>추천하는 코스가 없어요</Txt>
            <Txt style={styles.emptyBody}>예산을 조금 늘리거나 차 조건을 바꿔서 다시 시도해 보세요.</Txt>
            <Pressable onPress={onBack} style={styles.emptyButton} accessibilityRole="button">
              <Txt style={styles.emptyButtonLabel}>조건 바꾸기</Txt>
            </Pressable>
          </Card>
        </View>
      ) : (
        <>
          {result.courses.map((c, i) => (
            <CourseCard key={`${c.title}-${i}`} index={i + 1} course={c} meta={result.meta} />
          ))}
          {moreError ? <Txt style={styles.moreError}>{moreError}</Txt> : null}
          <Pressable onPress={onMore} disabled={loadingMore} style={[styles.moreButton, loadingMore && styles.moreButtonBusy]} accessibilityRole="button">
            <Txt style={styles.moreLabel}>{loadingMore ? "다른 코스 찾는 중…" : "다른 코스 더 보기"}</Txt>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function CourseCard({ index, course, meta }: { index: number; course: Course; meta: RecommendResponse["meta"] }) {
  const total = `둘이 약 ${course.knownTotalKrw.toLocaleString("ko-KR")}원${course.hasUnknownPrice ? " +α" : ""}`;
  const share = () => {
    void Share.share({ message: formatCourseText(course, meta) }).catch(() => undefined);
  };
  return (
    <Card style={styles.course}>
      <View style={styles.courseHead}>
        <View style={styles.badge}>
          <Txt style={styles.badgeLabel}>{index}</Txt>
        </View>
        <Txt style={styles.courseTitle}>{course.title}</Txt>
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="이 코스 공유" hitSlop={10} style={styles.shareButton}>
          <IconShare />
        </Pressable>
      </View>
      <Txt style={styles.reason}>{course.reason}</Txt>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <TransportIcon mode={course.transport} />
          <Txt style={styles.chipLabel}>
            {TRANSPORT_LABEL[course.transport]}
            {course.totalTravelMin > 0 ? ` 이동 ${course.totalTravelMin}분` : ""}
          </Txt>
        </View>
        <View style={styles.chip}>
          <Txt style={styles.chipLabel}>{total}</Txt>
        </View>
        <View style={styles.chip}>
          <Txt style={styles.chipLabel}>
            {course.startTime} → {course.endTime}
          </Txt>
        </View>
      </View>
      <View>
        {course.stops.map((s, i) => (
          <View key={s.placeId}>
            <Stop stop={s} last={i === course.stops.length - 1} />
            {course.legs[i] ? <LegRow leg={course.legs[i] as Leg} /> : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

function TransportIcon({ mode }: { mode: Course["transport"] }) {
  if (mode === "car") return <IconCar />;
  if (mode === "transit") return <IconTransit />;
  return <IconWalk />;
}

function StepIcon({ kind }: { kind: RouteStep["kind"] }) {
  if (kind === "car") return <IconCar size={12} color={colors.muted} />;
  if (kind === "bus") return <IconTransit size={12} color={colors.muted} />;
  if (kind === "subway") return <IconSubway size={12} color={colors.muted} />;
  return <IconWalk size={12} color={colors.muted} />;
}

/** 장소와 장소 사이. 타임라인 선 옆에 이동 방법을 단계별로 적는다. */
function LegRow({ leg }: { leg: Leg }) {
  const summary = [`${leg.durationMin}분`, fmtDistance(leg.distanceM), leg.fareKrw !== null ? `${leg.fareKrw.toLocaleString("ko-KR")}원` : null, leg.estimated ? "어림" : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.legRow}>
      <View style={styles.timeline}>
        <View style={styles.line} />
      </View>
      <Pressable style={styles.legBody} onPress={() => leg.mapUrl && Linking.openURL(leg.mapUrl)} disabled={!leg.mapUrl} accessibilityRole={leg.mapUrl ? "link" : undefined}>
        {leg.steps.length === 0 ? (
          <View style={styles.stepRow}>
            <StepIcon kind={leg.mode === "transit" ? "bus" : leg.mode} />
            <Txt style={styles.stepText}>{TRANSPORT_LABEL[leg.mode]}</Txt>
          </View>
        ) : (
          leg.steps.map((st, i) => (
            <View key={`${st.kind}-${i}`} style={styles.stepRow}>
              <StepIcon kind={st.kind} />
              <Txt style={styles.stepText}>{st.text}</Txt>
            </View>
          ))
        )}
        <Txt style={styles.legSummary}>{summary}</Txt>
      </Pressable>
    </View>
  );
}

function Stop({ stop, last }: { stop: CourseStop; last: boolean }) {
  const price = stop.priceHintKrw === null ? "가격 정보 없음" : `1인 약 ${stop.priceHintKrw.toLocaleString("ko-KR")}원`;
  const m = stop.mentionCounts;
  const sources = [m.blog > 0 ? `블로그 ${m.blog}` : null, m.instagram > 0 ? `인스타 ${m.instagram}` : null, m.web > 0 ? `웹 ${m.web}` : null].filter(Boolean).join(" · ");
  const sub = [stop.category?.split(">").pop()?.trim(), stop.stayMin > 0 ? `약 ${stop.stayMin}분` : null, price, PARKING_LABEL[stop.parking], sources || null].filter(Boolean).join(" · ");
  return (
    <View style={styles.stopRow}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {last ? null : <View style={styles.line} />}
      </View>
      <Pressable
        style={[styles.stopBody, last && styles.stopBodyLast]}
        onPress={() => stop.url && Linking.openURL(stop.url)}
        disabled={!stop.url}
        accessibilityRole={stop.url ? "link" : undefined}
        accessibilityLabel={stop.name}
      >
        <View style={styles.stopHead}>
          {stop.arrivalTime ? <Txt style={styles.stopTime}>{stop.arrivalTime}</Txt> : null}
          <Txt style={styles.stopName}>{stop.name}</Txt>
        </View>
        {stop.hint ? <Txt style={styles.stopHint}>{stop.hint}</Txt> : null}
        <Txt style={styles.stopSub}>{sub}</Txt>
        {stop.parkingLot ? (
          <View style={styles.parkingRow}>
            <IconParking size={12} color={colors.muted} />
            <Txt style={styles.stopSub}>
              {stop.parkingLot.name} · {stop.parkingLot.distanceM}m
            </Txt>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 56, paddingBottom: 24, gap: 12 },
  containerEmpty: { flexGrow: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, height: 24 },
  backLabel: { fontSize: 14, lineHeight: 20, color: colors.muted },
  header: { gap: 4 },
  title: { fontSize: 26, lineHeight: 32 },
  meta: { fontSize: 13, lineHeight: 18, color: colors.muted },

  course: { paddingTop: 18, gap: 12 },
  courseHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  badgeLabel: { color: colors.white, fontSize: 15, lineHeight: 20 },
  courseTitle: { fontSize: 18, lineHeight: 24, flex: 1 },
  shareButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  reason: { fontSize: 14, lineHeight: 21 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.field },
  chipLabel: { fontSize: 13, lineHeight: 18 },

  stopRow: { flexDirection: "row", gap: 12 },
  legRow: { flexDirection: "row", gap: 12 },
  timeline: { width: 14, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 4 },
  stopBody: { flex: 1, gap: 3, paddingBottom: 10 },
  stopBodyLast: { paddingBottom: 0 },
  stopHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  stopTime: { fontSize: 12, lineHeight: 17, color: colors.accent },
  stopName: { fontSize: 15, lineHeight: 21, flex: 1 },
  stopHint: { fontSize: 13, lineHeight: 18, color: colors.hint },
  stopSub: { fontSize: 12, lineHeight: 17, color: colors.muted },
  parkingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  legBody: { flex: 1, gap: 2, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12, borderRadius: radii.field, backgroundColor: colors.field },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepText: { fontSize: 12, lineHeight: 17, flex: 1 },
  legSummary: { fontSize: 11, lineHeight: 15, color: colors.muted },

  moreButton: { height: 48, borderRadius: radii.pill, backgroundColor: colors.field, alignItems: "center", justifyContent: "center", marginTop: 4 },
  moreButtonBusy: { opacity: 0.6 },
  moreLabel: { fontSize: 15, lineHeight: 20, color: colors.accent },
  moreError: { fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: "center" },

  emptyWrap: { flex: 1, justifyContent: "center" },
  emptyCard: { alignItems: "center", gap: 14, paddingVertical: 32, paddingHorizontal: 20 },
  emptyArt: { width: 96, height: 72, alignItems: "center", justifyContent: "center" },
  emptyBlobBig: { position: "absolute", left: 6, top: 10, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accentSoft },
  emptyBlobSmall: { position: "absolute", right: 4, top: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, opacity: 0.55 },
  emptyTitle: { fontSize: 18, lineHeight: 24 },
  emptyBody: { fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center" },
  emptyButton: { height: 44, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: colors.field, alignItems: "center", justifyContent: "center" },
  emptyButtonLabel: { fontSize: 15, lineHeight: 20, color: colors.accent },
});
