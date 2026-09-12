import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import type { RecommendRequest } from "@oneureodi/shared";
import { Blob } from "../components/Blob";
import { Card } from "../components/Card";
import { Segmented } from "../components/Segmented";
import { IconHistory } from "../components/icons";
import { Txt } from "../components/Txt";
import type { SavedRecommendation } from "../storage";
import { accentShadow, colors, font, radii } from "../theme";

interface Props {
  error: string | null;
  onSubmit: (req: RecommendRequest) => void;
  /** 마지막 추천. 있으면 "지난 추천 다시 보기"를 보여준다 */
  last: SavedRecommendation | null;
  onShowLast: () => void;
}

const WEEKDAYS = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일", tint: colors.accent },
] as const;

export function FormScreen({ error, onSubmit, last, onShowLast }: Props) {
  const [location, setLocation] = useState("");
  const [social, setSocial] = useState<RecommendRequest["traits"]["social"]>("extrovert");
  const [activity, setActivity] = useState<RecommendRequest["traits"]["activity"]>("like");
  const [budget, setBudget] = useState("100000");
  const [hasCar, setHasCar] = useState(false);
  const [weekday, setWeekday] = useState<number>(6);
  const [time, setTime] = useState("14:00");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    const budgetKrw = Number(budget.replace(/[^\d]/g, ""));
    if (!location.trim()) return setLocalError("만날 지역이나 역 이름을 적어주세요");
    if (!/\d/.test(budget)) return setLocalError("예산을 숫자로 적어주세요");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setLocalError("시간은 14:00 처럼 적어주세요");
    setLocalError(null);
    onSubmit({ location: location.trim(), traits: { social, activity }, budgetKrw, hasCar, meetAt: { weekday, time }, excludePlaceIds: [] });
  };

  const message = localError ?? error;
  const budgetDisplay = budget.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Blob size={120} style={{ top: 30, right: -30 }} />
      <Blob size={40} color={colors.accent} style={{ top: 90, right: 40, opacity: 0.6 }} />

      <View style={styles.header}>
        <Txt style={styles.title}>오늘 어디?</Txt>
        <Txt style={styles.subtitle}>조건만 알려주면 코스 5개를 골라드려요</Txt>
      </View>

      {last ? (
        <Pressable onPress={onShowLast} style={styles.lastPill} accessibilityRole="button" hitSlop={4}>
          <IconHistory />
          <Txt style={styles.lastLabel}>
            지난 추천 다시 보기 · {last.result.meta.anchor.name} {last.result.courses.length}개
          </Txt>
        </Pressable>
      ) : null}

      <Card>
        <Txt style={styles.label}>만날 곳</Txt>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="성수동, 홍대입구역 같은 곳"
          placeholderTextColor={colors.placeholder}
          returnKeyType="done"
        />
      </Card>

      <Card>
        <Txt style={styles.label}>우리 성향</Txt>
        <Segmented
          options={[
            { value: "extrovert", label: "외향적" },
            { value: "introvert", label: "내향적" },
          ]}
          value={social}
          onChange={setSocial}
        />
        <Segmented
          options={[
            { value: "like", label: "액티비티 좋아함" },
            { value: "dislike", label: "안 좋아함" },
          ]}
          value={activity}
          onChange={setActivity}
        />
      </Card>

      <View style={styles.row}>
        <Card style={styles.grow}>
          <Txt style={styles.label}>둘이 쓸 돈</Txt>
          <View style={styles.inputRow}>
            <TextInput style={styles.inputBare} value={budgetDisplay} onChangeText={setBudget} keyboardType="number-pad" />
            <Txt style={styles.unit}>원</Txt>
          </View>
        </Card>
        <Card style={styles.carCard}>
          <Txt style={styles.label}>차</Txt>
          <View style={styles.switchRow}>
            <Txt style={styles.value}>{hasCar ? "있음" : "없음"}</Txt>
            <Switch
              value={hasCar}
              onValueChange={setHasCar}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.line}
            />
          </View>
        </Card>
      </View>

      <Card>
        <Txt style={styles.label}>만나는 요일과 시간</Txt>
        <Segmented options={WEEKDAYS} value={weekday} onChange={setWeekday} variant="circle" />
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="14:00" placeholderTextColor={colors.placeholder} keyboardType="numbers-and-punctuation" />
      </Card>

      {message ? <Txt style={styles.error}>{message}</Txt> : null}

      <View style={styles.spacer} />

      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={submit} accessibilityRole="button">
        <Txt style={styles.buttonLabel}>코스 추천받기</Txt>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 20, paddingTop: 56, paddingBottom: 24, gap: 12 },
  header: { gap: 4 },
  spacer: { flexGrow: 1 },
  title: { fontSize: 30, lineHeight: 36 },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontSize: 13, lineHeight: 18, color: colors.muted },
  lastPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.field,
  },
  lastLabel: { fontSize: 13, lineHeight: 18, color: colors.accent },
  input: {
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: colors.field,
    borderRadius: radii.field,
    fontFamily: font,
    fontSize: 16,
    color: colors.text,
  },
  inputRow: {
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: colors.field,
    borderRadius: radii.field,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputBare: { flex: 1, fontFamily: font, fontSize: 16, color: colors.text, padding: 0 },
  unit: { fontSize: 16, color: colors.placeholder },
  row: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 },
  carCard: { width: 128 },
  switchRow: { height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { fontSize: 16 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  button: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...accentShadow,
  },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { color: colors.white, fontSize: 17, lineHeight: 22 },
});
