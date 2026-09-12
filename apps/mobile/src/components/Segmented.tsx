import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii } from "../theme";
import { Txt } from "./Txt";

interface Option<T extends string | number> {
  value: T;
  label: string;
  /** 선택 안 됐을 때 글자색. 일요일처럼 강조할 때 */
  tint?: string;
}

interface Props<T extends string | number> {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** fill: 가로를 나눠 채우는 알약 (성향). circle: 42px 동그라미 (요일) */
  variant?: "fill" | "circle";
}

export function Segmented<T extends string | number>({ options, value, onChange, variant = "fill" }: Props<T>) {
  return (
    <View style={[styles.row, variant === "circle" && styles.rowCircle]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.item, variant === "circle" ? styles.circle : styles.fill, active && styles.active]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={variant === "circle" ? 2 : undefined}
          >
            <Txt style={[styles.label, variant === "circle" && styles.circleLabel, { color: active ? colors.white : (o.tint ?? colors.muted) }]}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  rowCircle: { gap: 6 },
  item: { alignItems: "center", justifyContent: "center", backgroundColor: colors.field, borderRadius: radii.pill },
  fill: { flex: 1, height: 44 },
  circle: { width: 42, height: 42 },
  active: { backgroundColor: colors.accent },
  label: { fontSize: 15, lineHeight: 20 },
  circleLabel: { fontSize: 14 },
});
