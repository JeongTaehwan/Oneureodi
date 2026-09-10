import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Course, CourseStop, RecommendResponse } from "@oneureodi/shared";

interface Props {
  result: RecommendResponse;
  onBack: () => void;
}

const TRANSPORT_LABEL = { walk: "도보", transit: "대중교통", car: "자차" } as const;
const PARKING_LABEL = { yes: "주차 가능", no: "주차 불가", unknown: "주차 정보 없음" } as const;

export function ResultScreen({ result, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>← 조건 다시 넣기</Text>
      </Pressable>
      <Text style={styles.title}>{result.meta.anchor.name} 근처</Text>
      <Text style={styles.subtitle}>
        후보 {result.meta.candidateCount}곳 · {result.meta.fromCache ? "모아둔 정보" : "방금 조사"} · {(result.meta.elapsedMs / 1000).toFixed(1)}초
      </Text>

      {result.courses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>추천하는 코스가 없어요</Text>
          <Text style={styles.emptyBody}>조건을 조금 바꿔서 다시 시도해 보세요.</Text>
        </View>
      ) : (
        result.courses.map((c, i) => <CourseCard key={`${c.title}-${i}`} index={i + 1} course={c} />)
      )}
    </ScrollView>
  );
}

function CourseCard({ index, course }: { index: number; course: Course }) {
  const total = `${course.knownTotalKrw.toLocaleString("ko-KR")}원${course.hasUnknownPrice ? " +α" : ""}`;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {index}. {course.title}
      </Text>
      <Text style={styles.reason}>{course.reason}</Text>
      <Text style={styles.metaLine}>
        {TRANSPORT_LABEL[course.transport]} 이동 · 2인 약 {total}
      </Text>
      {course.stops.map((s, i) => (
        <Stop key={s.placeId} order={i + 1} stop={s} />
      ))}
    </View>
  );
}

function Stop({ order, stop }: { order: number; stop: CourseStop }) {
  const price = stop.priceHintKrw === null ? "가격 정보 없음" : `1인 약 ${stop.priceHintKrw.toLocaleString("ko-KR")}원`;
  return (
    <Pressable style={styles.stop} onPress={() => stop.url && Linking.openURL(stop.url)} disabled={!stop.url}>
      <Text style={styles.stopName}>
        {order}. {stop.name}
      </Text>
      {stop.category ? <Text style={styles.stopSub}>{stop.category}</Text> : null}
      {stop.hint ? <Text style={styles.stopHint}>“{stop.hint}”</Text> : null}
      <Text style={styles.stopSub}>
        {price} · {PARKING_LABEL[stop.parking]}
        {stop.mentionCount > 0 ? ` · 웹 글 ${stop.mentionCount}건` : ""}
      </Text>
      {stop.address ? <Text style={styles.stopAddr}>{stop.address}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 64, gap: 14, backgroundColor: "#fafafa" },
  back: { fontSize: 14, color: "#555" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#777", marginTop: -8 },
  empty: { padding: 24, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyBody: { fontSize: 14, color: "#666" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: "#eee" },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  reason: { fontSize: 14, color: "#333", lineHeight: 20 },
  metaLine: { fontSize: 13, color: "#555" },
  stop: { borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 10, gap: 2 },
  stopName: { fontSize: 15, fontWeight: "600" },
  stopSub: { fontSize: 12, color: "#666" },
  stopHint: { fontSize: 13, color: "#444", fontStyle: "italic" },
  stopAddr: { fontSize: 11, color: "#999" },
});
