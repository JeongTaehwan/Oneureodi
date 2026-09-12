import { StyleSheet, View, type ViewProps } from "react-native";
import { cardShadow, colors, radii } from "../theme";

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.card, padding: 16, gap: 10, ...cardShadow },
});
