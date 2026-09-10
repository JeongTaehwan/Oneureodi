import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import type { RecommendRequest, RecommendResponse } from "@oneureodi/shared";
import { ApiError, fetchRecommendations } from "./src/api";
import { FormScreen } from "./src/screens/FormScreen";
import { ResultScreen } from "./src/screens/ResultScreen";

export default function App() {
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (req: RecommendRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await fetchRecommendations(req));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "알 수 없는 오류가 났어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {result ? <ResultScreen result={result} onBack={() => setResult(null)} /> : <FormScreen submitting={submitting} error={error} onSubmit={submit} />}
      <StatusBar style="auto" />
    </>
  );
}
