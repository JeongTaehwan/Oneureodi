import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Blob } from "../components/Blob";
import { Txt } from "../components/Txt";
import { colors } from "../theme";

const DOT_COLORS = [colors.accent, "#F6AD97", "#FFD0C0"] as const;

export function LoadingScreen({ location }: { location: string }) {
  return (
    <View style={styles.screen}>
      <Blob size={140} style={{ top: 120, left: -40 }} />
      <Blob size={110} style={{ bottom: 160, right: -30 }} />
      <View style={styles.dots}>
        {DOT_COLORS.map((c, i) => (
          <Dot key={c} color={c} delay={i * 180} />
        ))}
      </View>
      <View style={styles.textBlock}>
        <Txt style={styles.title}>{location} 근처를 뒤지는 중</Txt>
        <Txt style={styles.body}>처음 가는 동네는 20초쯤 걸려요</Txt>
      </View>
    </View>
  );
}

function Dot({ color, delay }: { color: string; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // 시작 지연은 한 번만. 루프 안에 두면 점마다 주기가 달라져 위상이 어긋난다.
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(y, { toValue: -8, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(y, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [y, delay]);
  return <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: y }] }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 22, overflow: "hidden" },
  dots: { flexDirection: "row", gap: 12 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  textBlock: { alignItems: "center", gap: 6 },
  title: { fontSize: 20, lineHeight: 28 },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted },
});
