import { View, type ViewStyle } from "react-native";
import { colors } from "../theme";

/** 배경의 둥근 장식. 위치는 호출부가 absolute 로 준다. */
export function Blob({ size, color = colors.accentSoft, style }: { size: number; color?: string; style?: ViewStyle }) {
  return <View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}
