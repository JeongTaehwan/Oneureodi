import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { RecommendRequest } from "@oneureodi/shared";
import { Segmented } from "../components/Segmented";

interface Props {
  submitting: boolean;
  error: string | null;
  onSubmit: (req: RecommendRequest) => void;
}

const WEEKDAYS = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" },
] as const;

export function FormScreen({ submitting, error, onSubmit }: Props) {
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
    if (!Number.isFinite(budgetKrw)) return setLocalError("예산은 숫자로 적어주세요");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setLocalError("시간은 14:00 처럼 적어주세요");
    setLocalError(null);
    onSubmit({ location: location.trim(), traits: { social, activity }, budgetKrw, hasCar, meetAt: { weekday, time } });
  };

  const message = localError ?? error;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>오늘 어디?</Text>
      <Text style={styles.subtitle}>조건을 넣으면 데이트 코스 5개를 골라줘요</Text>

      <Field label="만날 곳 (지역명 또는 역)">
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="예) 성수동, 홍대입구역" />
      </Field>

      <Field label="우리 성향">
        <Segmented
          options={[
            { value: "extrovert", label: "외향적" },
            { value: "introvert", label: "내향적" },
          ]}
          value={social}
          onChange={setSocial}
        />
        <View style={{ height: 8 }} />
        <Segmented
          options={[
            { value: "like", label: "액티비티 좋아함" },
            { value: "dislike", label: "액티비티 안 좋아함" },
          ]}
          value={activity}
          onChange={setActivity}
        />
      </Field>

      <Field label="쓸 수 있는 돈 (2인 합산, 원)">
        <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
      </Field>

      <Field label="차">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{hasCar ? "있음 · 주차 되는 곳만 골라요" : "없음 · 대중교통·도보 기준"}</Text>
          <Switch value={hasCar} onValueChange={setHasCar} />
        </View>
      </Field>

      <Field label="만나는 요일과 시간">
        <Segmented options={WEEKDAYS} value={weekday} onChange={setWeekday} />
        <View style={{ height: 8 }} />
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="14:00" keyboardType="numbers-and-punctuation" />
      </Field>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonLabel}>{submitting ? "코스 찾는 중… (최대 10초)" : "코스 추천받기"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 64, gap: 20, backgroundColor: "#fafafa" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginTop: -12 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#444" },
  input: { borderWidth: 1, borderColor: "#d0d0d0", borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: "#fff" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontSize: 14, color: "#333", flex: 1 },
  error: { color: "#c62828", fontSize: 13 },
  button: { backgroundColor: "#1f1f1f", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
