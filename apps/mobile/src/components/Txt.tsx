import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, font } from "../theme";

/** 앱의 모든 글자. 폰트 하나(고운돋움)라 굵기 없이 크기와 색으로만 위계를 준다. */
export function Txt({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: font, color: colors.text, fontSize: 14, lineHeight: 20 },
});
