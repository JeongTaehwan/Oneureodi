import { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, GowunDodum_400Regular } from "@expo-google-fonts/gowun-dodum";
import type { RecommendRequest, RecommendResponse } from "@oneureodi/shared";
import { ApiError, fetchRecommendations } from "./src/api";
import { FormScreen } from "./src/screens/FormScreen";
import { LoadingScreen } from "./src/screens/LoadingScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { loadLast, saveLast, type SavedRecommendation } from "./src/storage";
import { colors } from "./src/theme";

type Phase = { kind: "form" } | { kind: "loading"; location: string } | { kind: "result"; request: RecommendRequest; result: RecommendResponse };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ GowunDodum_400Regular });
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<SavedRecommendation | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  useEffect(() => {
    void loadLast().then(setLast);
  }, []);

  const submit = async (req: RecommendRequest) => {
    setError(null);
    setPhase({ kind: "loading", location: req.location });
    try {
      const result = await fetchRecommendations(req);
      setPhase({ kind: "result", request: req, result });
      setLast({ request: req, result, savedAt: new Date().toISOString() });
      void saveLast(req, result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "알 수 없는 오류가 났어요");
      setPhase({ kind: "form" });
    }
  };

  /** "다른 코스 더 보기": 지금까지 보여준 장소를 빼 달라고 하고, 새 코스를 뒤에 붙인다. */
  const loadMore = async () => {
    if (phase.kind !== "result" || loadingMore) return;
    const seen = [...new Set(phase.result.courses.flatMap((c) => c.stops.map((s) => s.placeId)))];
    const req: RecommendRequest = { ...phase.request, excludePlaceIds: seen.slice(0, 200) };
    setLoadingMore(true);
    setMoreError(null);
    try {
      const more = await fetchRecommendations(req);
      const merged: RecommendResponse = { ...phase.result, courses: [...phase.result.courses, ...more.courses] };
      setPhase({ kind: "result", request: phase.request, result: merged });
      setLast({ request: phase.request, result: merged, savedAt: new Date().toISOString() });
      void saveLast(phase.request, merged);
      if (more.courses.length === 0) setMoreError("더 찾은 코스가 없어요");
    } catch (e) {
      setMoreError(e instanceof ApiError ? e.message : "알 수 없는 오류가 났어요");
    } finally {
      setLoadingMore(false);
    }
  };

  // 폰트가 오기 전에 시스템 폰트로 한 번 그리면 깜빡인다. 배경색만 보여주고 기다린다. 로드 실패면 시스템 폰트로라도 그린다.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <>
      {phase.kind === "form" && (
        <FormScreen error={error} onSubmit={submit} last={last} onShowLast={() => last && setPhase({ kind: "result", request: last.request, result: last.result })} />
      )}
      {phase.kind === "loading" && <LoadingScreen location={phase.location} />}
      {phase.kind === "result" && (
        <ResultScreen result={phase.result} onBack={() => setPhase({ kind: "form" })} onMore={loadMore} loadingMore={loadingMore} moreError={moreError} />
      )}
      <StatusBar style="dark" />
    </>
  );
}
